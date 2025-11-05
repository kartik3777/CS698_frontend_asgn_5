import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

// --- CONFIGURATION ---
// !! IMPORTANT !!
// Change this to your live Render/Vercel/etc. URL when you deploy
const API_BASE_URL = "https://cs698-a3-2.onrender.com"; 
// ---------------------


// Tooltip helper (from your original code)
const InfoTooltip = ({ text }) => (
  <span className="tooltip-container">
    <span className="tooltip-icon">ⓘ</span>
    <span className="tooltip-text">{text}</span>
  </span>
);

// --- NEW COMPONENT: ExplanationChart ---
// Renders the horizontal bar chart for SHAP impacts
const ExplanationChart = ({ title, data, note }) => {
  if (!data || data.length === 0) return null;

  // Find max absolute impact for scaling
  const maxImpact = Math.max(...data.map(d => Math.abs(d.impact)));

  return (
    <div className="impact-chart">
      <h4>{title}</h4>
      <p className="chart-note">{note}</p>
      <div className="chart-legend">
        <span className="legend-item negative">Decreases Likelihood</span>
        <span className="legend-item positive">Increases Likelihood</span>
      </div>
      {data.map(({ feature, impact }) => {
        const width = (Math.abs(impact) / maxImpact) * 100;
        const isPositive = impact > 0;
        return (
          <div className="impact-bar-row" key={feature}>
            <span className="bar-label">{feature}</span>
            <div className="bar-container">
              <div
                className={`impact-bar ${isPositive ? 'positive' : 'negative'}`}
                style={{ width: `${width}%` }}
                title={`Impact: ${impact.toFixed(4)}`}
              >
              </div>
            </div>
            <span className="bar-value">{impact.toFixed(3)}</span>
          </div>
        );
      })}
    </div>
  );
};

// --- NEW COMPONENT: AdvancedExplanation ---
// Wraps your original hardcoded XGBoost math
const AdvancedExplanation = () => (
  <div className="advanced-math">
    <h2>🧠 Overview: What XGBoost Does</h2>
    <p>
      XGBoost is a machine-learning algorithm that builds an <em>ensemble of small decision trees</em>,
      where each new tree learns to <em>correct the errors</em> made by the previous ones.
    </p>
    <blockquote>
      “If admission grade is high and most courses are approved → higher chance of graduation.”
    </blockquote>
    <p>All trees then combine their “votes” to produce the final probability that a student will graduate.</p>
    <hr />
    <h2>🌳 How the Model Learns (Step by Step)</h2>
    <h3>1️⃣ Building Trees</h3>
    <pre>{`ŷ_i = Σ_{t=1}^{T} f_t(x_i)`}</pre>
    <hr />
    <h3>2️⃣ Objective Function</h3>
    <pre>{`Obj = Σ_{i=1}^{n} l(y_i, ŷ_i) + Σ_{t=1}^{T} Ω(f_t)`}</pre>
    <ul>
      <li>l(y_i, ŷ_i) → how wrong the prediction is (loss)</li>
      <li>Ω(f_t) → penalty for overly complex trees (regularization)</li>
    </ul>
    <hr />
    <h3>3️⃣ Using Gradients and Hessians</h3>
    <pre>{`Obj^(t) ≈ Σ_i [ l(y_i, ŷ_i^(t-1)) + g_i f_t(x_i) + 0.5 h_i f_t^2(x_i) ] + Ω(f_t)`}</pre>
    <hr />
    <h3>4️⃣ Leaf Weights and Tree Splits</h3>
    <pre>{`w_j* = - Σ_{i∈j} g_i / (Σ_{i∈j} h_i + λ)`}</pre>
    <pre>{`Gain = 0.5 [ (Σ_{i∈L} g_i)^2/(...) + (Σ_{i∈R} g_i)^2/(...) - (Σ_{i∈L∪R} g_i)^2/(...) ] - γ`}</pre>
    <hr />
    <h2>📊 Making a Prediction</h2>
    <ol>
      <li>Student data x is passed through all trees.</li>
      <li>Each tree outputs a small “vote” or weight.</li>
      <li>All votes are added: <pre>{`ŷ_raw = Σ_{t=1}^{T} f_t(x)`}</pre></li>
      <li>Converted into probability using sigmoid: <pre>{`p = 1 / (1 + e^{-ŷ_raw})`}</pre></li>
    </ol>
  </div>
);


// --- MAIN APP COMPONENT ---
export default function App() {
  const [formData, setFormData] = useState({
    applicationOrder: 1,
    inflationRate: 2.5,
    applicationMode: 5,
    GDP: 1.8,
    unemploymentRate: 7.4,
    course: 9500,
    cu1Evaluations: 6,
    cu2Evaluations: 5,
    ageAtEnrollment: 20,
    admissionGrade: 145,
    cu1Approved: 5,
    cu1Grade: 13.5,
    cu2Grade: 14,
    cu2Approved: 4,
  });

  const [loading, setLoading] = useState(false);
  
  // --- NEW STATE ---
  // Global Explanations
  const [globalModelInfo, setGlobalModelInfo] = useState(null);
  const [globalFeatureImportance, setGlobalFeatureImportance] = useState(null);
  
  // Local (Per-Prediction) Explanations
  const [prediction, setPrediction] = useState(null);
  const [localExplanation, setLocalExplanation] = useState(null);
  const [actionableExplanation, setActionableExplanation] = useState(null);
  
  // For UI
  const [showAdvancedMath, setShowAdvancedMath] = useState(false);
  const [activeTab, setActiveTab] = useState('why');

  const resultsRef = useRef(null);

  // --- NEW: Fetch Global Data on Load ---
  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const infoRes = await axios.get(`${API_BASE_URL}/model_info`);
        setGlobalModelInfo(infoRes.data);

        const importanceRes = await axios.get(`${API_BASE_URL}/global_explanation`);
        setGlobalFeatureImportance(importanceRes.data);

      } catch (error) {
        console.error("Failed to load global model data:", error);
        alert("Failed to connect to the model API. Is the backend server running?");
      }
    };
    fetchGlobalData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- UPDATED: handlePredict (now chains 3 API calls) ---
  const handlePredict = async () => {
    setLoading(true);
    setPrediction(null);
    setLocalExplanation(null);
    setActionableExplanation(null);

    // This is the payload for all 3 API calls
    const payload = {
      "Application order": Number(formData.applicationOrder),
      "Inflation rate": Number(formData.inflationRate),
      "Application mode": Number(formData.applicationMode),
      "GDP": Number(formData.GDP),
      "Unemployment rate": Number(formData.unemploymentRate),
      "Course": Number(formData.course),
      "Curricular units 1st sem (evaluations)": Number(formData.cu1Evaluations),
      "Curricular units 2nd sem (evaluations)": Number(formData.cu2Evaluations),
      "Age at enrollment": Number(formData.ageAtEnrollment),
      "Admission grade": Number(formData.admissionGrade),
      "Curricular units 1st sem (approved)": Number(formData.cu1Approved),
      "Curricular units 1st sem (grade)": Number(formData.cu1Grade),
      "Curricular units 2nd sem (grade)": Number(formData.cu2Grade),
      "Curricular units 2nd sem (approved)": Number(formData.cu2Approved),
    };

    try {
      // 1. Get Prediction
      const predictResponse = await axios.post(`${API_BASE_URL}/predict`, payload);
      const predResult = predictResponse.data[0];
      setPrediction(predResult);
      setActiveTab(predResult.prediction_label); // Set tab to predicted class

      // 2. Get Local Explanation (WHY / WHY NOT)
      const localExResponse = await axios.post(`${API_BASE_URL}/local_explanation`, payload);
      setLocalExplanation(localExResponse.data);

      // 3. Get Actionable Explanation (HOW TO / HOW TO STILL BE)
      // We'll hardcode the "good" and "bad" classes for this example
      const actionableExResponse = await axios.post(
        `${API_BASE_URL}/actionable_explanations?target_class=Graduate&undesirable_class=Dropout`,
        payload
      );
      setActionableExplanation(actionableExResponse.data);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: "smooth" });
      }, 100);

    } catch (error) {
      console.error("Error during prediction or explanation:", error);
      let errorMsg = "An error occurred.";
      if (error.response && error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMsg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMsg = error.response.data.detail[0].msg;
        }
      }
      alert(`Failed to get prediction: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Helper to get explanation data for tabs ---
  const getExplanationForClass = (className) => {
    if (!localExplanation) return null;
    return localExplanation.explanations.find(e => e.class_name === className);
  };
  
  const getOtherClassName = () => {
    if (!prediction) return 'Graduate';
    if (prediction.prediction_label === 'Graduate') return 'Dropout';
    if (prediction.prediction_label === 'Dropout') return 'Graduate';
    return 'Enrolled'; // Fallback
  }

  // Tooltips (from your original code)
  const tooltips = {
    applicationOrder: "The order in which the student submitted the application.",
    inflationRate: "Current inflation rate (%) affecting tuition and economy.",
    // ... (rest of your tooltips) ...
  };

  return (
    <div className="container">
      <header>
        <h1>🎓 Fair Student Outcome Predictor</h1>
        <p className="subtitle">
          Predict student success with *fully explainable* AI.
        </p>
      </header>

      <main className="main-content">
        <div className="input-section">
          <div className="card">
            <h2>Enter Student & Course Details</h2>
            <div className="form-grid">
              {Object.entries(formData).map(([key, value]) => (
                <div className="form-group" key={key}>
                  <label>
                    {key.replace(/([A-Z])/g, " $1")}
                    {tooltips[key] && <InfoTooltip text={tooltips[key]} />}
                  </label>
                  <input
                    type="number"
                    name={key}
                    value={value}
                    onChange={handleChange}
                  />
                </div>
              ))}
            </div>
            <button className="predict-btn" onClick={handlePredict} disabled={loading}>
              {loading ? "Analyzing..." : "Predict & Explain Outcome"}
            </button>
          </div>
        </div>

        {/* --- UPDATED & DYNAMIC OUTPUT SECTION --- */}
        <div className="output-section" ref={resultsRef}>

          {/* --- GLOBAL EXPLANATIONS (from API) --- */}
          <div className="card info-card">
            <h2>ℹ️ About This Model (Global Explanation)</h2>
            {globalModelInfo ? (
              <>
                <p><strong>INPUT:</strong> {globalModelInfo.global_explanation_report.INPUT}</p>
                <p><strong>OUTPUT:</strong> {globalModelInfo.global_explanation_report.OUTPUT}</p>
                <p><strong>HOW:</strong> {globalModelInfo.global_explanation_report.HOW}</p>
              </>
            ) : <p>Loading model info...</p>}
          </div>

          <div className="card fairness-card">
            <h2>PERFORMANCE: Model Performance & Fairness</h2>
            {globalModelInfo ? (
              <div className="metrics-grid">
                <div className="metric-item">
                  <p>Accuracy <InfoTooltip text={globalModelInfo.metadata.model_performance.notes} /></p>
                  <p className="metric-value">{globalModelInfo.metadata.model_performance.test_accuracy}</p>
                </div>
                <div className="metric-item">
                  <p>F1-Score (Weighted) <InfoTooltip text="A balanced measure of performance." /></p>
                  <p className="metric-value">{globalModelInfo.metadata.model_performance.f1_score_weighted}</p>
                </div>
                {/* You can add your original 'Bias' metrics here if they are in the metadata */}
              </div>
            ) : <p>Loading performance...</p>}
          </div>

          <div className="card fairness-card">
            <h2>HOW: Global Feature Importance</h2>
            <p>These features have the biggest impact on predictions *overall*.</p>
            {globalFeatureImportance ? (
              <ol className="importance-list">
                {globalFeatureImportance.top_features.map(f => (
                  <li key={f.feature}>
                    <strong>{f.feature}</strong> (Impact: {f.importance.toFixed(3)})
                  </li>
                ))}
              </ol>
            ) : <p>Loading feature importance...</p>}
          </div>
          
          {/* --- Divider --- */}
          <hr className="section-divider" />


          {/* --- LOCAL EXPLANATIONS (Per-Prediction) --- */}
          {loading && (
            <div className="card loading-card">
              <div className="spinner"></div>
              <p>Running model and generating explanations...</p>
            </div>
          )}

          {/* --- Main Prediction Result --- */}
          {prediction && (
            <div className="card result-card">
              <h2>Prediction Result</h2>
              <div className={`outcome-header ${prediction.prediction_label.toLowerCase()}`}>
                <span className="outcome-icon">
                  {prediction.prediction_label === "Graduate" ? "✅" : (prediction.prediction_label === 'Dropout' ? "❌" : "ℹ️")}
                </span>
                <p className="outcome-text">
                  This student is likely to <strong>{prediction.prediction_label}</strong>
                </p>
              </div>
              <div className="confidence-section">
                {/* Shows probabilities for ALL classes */}
                {prediction.class_probabilities && Object.entries(prediction.class_probabilities).map(([label, prob]) => (
                  <div className="prob-bar-row" key={label}>
                    <label>{label}</label>
                    <div className="confidence-bar-container">
                      <div
                        className="confidence-bar-fill"
                        style={{ width: `${prob * 100}%` }}
                      ></div>
                    </div>
                    <span>{(prob * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- NEW: Actionable Explanation Card (HOW TO / HOW TO STILL BE) --- */}
          {actionableExplanation && (
            <div className="card explanation-card">
              <h2>Actionable Advice ({actionableExplanation.recommendation_type})</h2>
              <p className="action-message">{actionableExplanation.message}</p>
              <ul className="action-list">
                {actionableExplanation.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* --- NEW: Local Explanation Card (WHY / WHY NOT) --- */}
          {localExplanation && prediction && (
            <div className="card explanation-card">
              <h2>Local Explanation (WHY / WHY NOT)</h2>
              <p>What specific features led to this prediction?</p>
              
              <div className="explanation-tabs">
                {/* Create tabs for each class */}
                {localExplanation.class_names.map(className => (
                  <button
                    key={className}
                    className={`tab-btn ${activeTab === className ? 'active' : ''}`}
                    onClick={() => setActiveTab(className)}
                  >
                    {/* Answer WHY and WHY NOT */}
                    {className === prediction.prediction_label ? 'WHY' : 'WHY NOT'} "{className}"?
                  </button>
                ))}
              </div>

              {/* Show chart for the active tab */}
              {localExplanation.class_names.map(className => (
                <div key={className} className={`tab-content ${activeTab === className ? 'active' : ''}`}>
                  <ExplanationChart
                    title={`Top Factors for "${className}"`}
                    note={`These features pushed the probability ${className === 'Graduate' ? 'UP' : 'DOWN'}.`}
                    data={getExplanationForClass(className)?.top_5_features}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* --- NEW: "What If" Card --- */}
          {prediction && (
            <div className="card explanation-card">
              <h2>"WHAT IF...?" Analysis</h2>
              <p>
                To see how the prediction would change, simply modify the
                values in the form above and click "Predict & Explain Outcome" again.
              </p>
            </div>
          )}

          {/* --- Your original XGBoost math, now collapsible --- */}
          <div className="card">
            <h2>Advanced: How XGBoost Works (Algorithm)</h2>
            <p>This shows the core math behind the model.</p>
            <button className="predict-btn" onClick={() => setShowAdvancedMath(!showAdvancedMath)}>
              {showAdvancedMath ? 'Hide' : 'Show'} Advanced Details
            </button>
            {showAdvancedMath && <AdvancedExplanation />}
          </div>

        </div>
      </main>
    </div>
  );
}