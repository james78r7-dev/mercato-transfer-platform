# ⚽ Mercato - Football Transfer Data Platform

A comprehensive football transfer data platform with real-time Transfermarkt integration and OBS Studio support.

## 🌟 Features

### 📊 Real-time Transfer Data
- Live data fetching from Transfermarkt
- Top 10 clubs by expenditure
- Arabic and English club names
- Financial data (expenditure, income, balance)

### 🎥 OBS Studio Integration
- Browser Source compatible
- Real-time data display
- Auto-rotating club information
- Professional overlay design

### 🏆 Club Management
- Comprehensive club database
- Logo management system
- League information
- Verified club data

### 🎨 Multiple Display Modes
- Ultimate display with animations
- Simple control panel system
- Real-time data synchronization
- Responsive design

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mercato.git
cd mercato
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:8201
```

## 📱 Usage

### For OBS Studio

1. **Control Panel**: Open `http://localhost:8201/obs-new-tols/transfermarkt-simple-control.html`
   - Fetch real-time data from Transfermarkt
   - Preview club information
   - Broadcast to OBS display

2. **OBS Browser Source**: Use `http://localhost:8201/obs-new-tols/transfermarkt-simple-output.html`
   - Add as Browser Source in OBS
   - Recommended size: 1920x1080
   - Auto-refresh enabled

### Available Endpoints

- `/obs-new-tols/transfermarkt-real-data.html` - Real-time data fetching
- `/obs-new-tols/transfermarkt-ultimate-display-fixed.html` - Ultimate display
- `/club-logo-manager.html` - Club logo management
- `/obs-new-tols/transfermarkt-simple-control.html` - Simple control panel
- `/obs-new-tols/transfermarkt-simple-output.html` - OBS output display

## 🛠️ API Endpoints

### Transfer Data
- `POST /api/fetch-transfermarkt-data` - Fetch latest transfer data
- `GET /api/clubs-database` - Get all clubs from database
- `GET /api/get-club-logo?clubName=...` - Get specific club logo

### Data Management
- `POST /api/save-simple-data` - Save data for OBS display
- `GET /api/get-simple-data` - Retrieve saved data
- `DELETE /api/clear-simple-data` - Clear saved data

## 🎯 OBS Studio Setup

1. Add **Browser Source** in OBS
2. Set URL to: `http://localhost:8201/obs-new-tols/transfermarkt-simple-output.html`
3. Set Width: 1920, Height: 1080
4. Check "Shutdown source when not visible"
5. Check "Refresh browser when scene becomes active"

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
PORT=8201
NODE_ENV=production
```

### Customization
- Modify club translations in `server.js`
- Update styling in individual HTML files
- Add new leagues in the league mapping function

## 📦 Deployment

### Render.com Deployment

1. Connect your GitHub repository to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Set environment variables as needed

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting provider

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/mercato/issues) page
2. Create a new issue with detailed description
3. Include browser console logs if applicable

## 🔗 Links

- [Live Demo](https://your-render-app.onrender.com)
- [Documentation](https://github.com/yourusername/mercato/wiki)
- [Issues](https://github.com/yourusername/mercato/issues)

---

Made with ❤️ for the football community
