# CloudTrim ☁️✂️

An elegant, AI-powered Cloud Cost Optimization and Infrastructure Audit Dashboard. CloudTrim analyzes cloud resources (VMs, databases, storage buckets) to identify waste, propose rightsizing, and recommend actions to trim down cloud expenditures.

## 🔗 Live Application Links
- **Development App:** [https://ais-pre-hqtx2uyoi2z7lpnqpmey2t-45819661097.asia-southeast1.run.app](https://ais-pre-hqtx2uyoi2z7lpnqpmey2t-45819661097.asia-southeast1.run.app)

---

## ✨ Features

- **Resource Spends Analysis:** Scan and map your active cloud footprint across virtual machines, object storage, and databases.
- **AI Audit Engine:** Identify idle instances, orphaned disks, over-provisioned databases, and mismatched configurations.
- **Actionable Optimization Recommendations:** Get categorized recommendations (Optimal, Rightsizing, Downscaling, Deletion) with detailed reasoning and exact estimated monthly savings.
- **Interactive Trend Charts:** Visualize your total costs, optimal spend target, and potential monthly savings.
- **Easy Upload & Integration:** Upload custom resource configurations or use standard mock configurations to audit on the fly.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, Framer Motion (for smooth layouts/animations)
- **Backend:** Express, Node.js, TypeScript, tsx, esbuild
- **AI Integration:** Google GenAI SDK (`@google/genai`)

---

## 🚀 How to Export or Push to GitHub

You can export or push this fully functional codebase to your GitHub repository (**https://github.com/PragathiSellamuthu/CloudTrim**) in two ways:

### Method 1: Exporting via AI Studio Settings (Recommended & Easiest)
1. In the **Google AI Studio** workspace UI, locate the **Settings** menu or **Export** option.
2. Select **Export to GitHub** or **Download ZIP**.
3. If exporting directly, connect your GitHub account and select your repository: `PragathiSellamuthu/CloudTrim`.
4. The platform will automatically push the entire project files to your repository.

### Method 2: Manual Push via Command Line
If you downloaded the code as a ZIP file, you can initialize git and push it manually with these commands:

```bash
# Extract the downloaded ZIP file and navigate into it
cd CloudTrim

# Initialize local Git repository
git init

# Add remote repository
git remote add origin https://github.com/PragathiSellamuthu/CloudTrim.git

# Stage and commit all files
git add .
git commit -m "Initial commit: Deploying CloudTrim to GitHub"

# Push to the main branch
git branch -M main
git push -u origin main
```

---

## ⚙️ Running Locally

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Gemini API Key

### Installation

1. Clone your repository:
   ```bash
   git clone https://github.com/PragathiSellamuthu/CloudTrim.git
   cd CloudTrim
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the development server (runs both Vite and Express backend):
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

---

## 📦 Build for Production

To compile both frontend static files and the backend Express bundle:

```bash
npm run build
npm run start
```
