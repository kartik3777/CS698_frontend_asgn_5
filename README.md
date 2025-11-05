
# 🎓 Fair Student Outcome Predictor (Frontend)

This project is a React-based web application that predicts a student's academic outcome (e.g., Graduate or Dropout) using an explainable AI model.  
It communicates with a backend API (XGBoost classifier) and provides rich interpretability through:

✅ Global explanations (model behavior overall)  
✅ Local explanations (why THIS student gets this prediction)  
✅ Actionable suggestions (how to improve)  
✅ Confidence probabilities  
✅ Interactive SHAP-based impact charts  

---

## 🚀 Features

### 🔮 Prediction
- Enter student demographic, academic, and economic fields.
- Predict whether the student is likely to **Graduate** or **Dropout**.

### 🧠 Explainability
- Visual bar charts showing which features increased/decreased the prediction probability.
- Tabs explaining:
  - “Why Graduate?”
  - “Why Not Graduate?”
  - Etc.

### 🏛️ Global Model Summary
- Shows how the model was trained
- Displays feature importance (SHAP values)
- Displays fairness/performance metrics such as:
  - Test Accuracy
  - Weighted F1 Score

### 🧩 Actionable Explanations
Concrete recommendations based on:
- Admission grade
- Course performance
- Evaluation count
- Etc.

### 🧪 "What-if" analysis
Adjust values and re-predict instantly.

---

## 🧾 Requirements

- Node.js ≥ 16.x
- NPM or Yarn
- Backend API running (Python/FastAPI recommended)

---

## 📦 Installation

```bash
git clone <repo-url>
cd frontend
npm install
```

---

## ▶️ Run Development Server

```bash
npm start
```

The app automatically opens at:

```
http://localhost:3000
```

---

## 🔗 API Configuration

In `App.js`, update:

```js
const API_BASE_URL = "https://cs698-a3-2.onrender.com";
```

## 🧬 Folder Structure

```
src/
│
├─ App.js              # Main application logic
├─ App.css             # Styling
├─ components/         # (Optional future expansion)
└─ assets/             # Images/icons
```

---

## 🧑‍💻 Tech Stack

- **React**
- **Axios** (REST communication)
- **XGBoost backend**
- **Explainable AI**
- **SHAP values**
- **Fairness inspection**

---

## 🎨 UI Highlights

- Responsive form layout with tooltips
- Interactive probability bars
- Collapsible advanced math section
- Smooth scroll into results

---

## 🔍 Explainability Tabs

Each class tab answers:

- “WHY Graduate?”
- “WHY Dropout?”
- “WHY NOT Graduate?”
- etc.

Bars represent the magnitude of push (toward or away).

---

## 🛂 Fairness & Transparency

This project helps demonstrate:

- Ethical AI workflows
- Transparent predictions
- Bias mitigation by design

---

## 🧑 Author

Built by Kartik and Mohd Nasar Siddiqui



