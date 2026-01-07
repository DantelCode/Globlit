# 🌍 Globlit — Modern News, Curated for You
Globlit is a modern, fast, and elegant news web application that delivers curated global and local news in a clean, app-like interface. It features real-time feeds, topic discovery, article reading with animations, swipe gestures, speech synthesis, and a smooth user experience inspired by native mobile news apps.
> **Read smarter. Scroll less. Stay informed.**


### Live Site: https://globlit.onrender.com


## ✨ Features

### 📰 News & Discovery
* **For You feed** (personalized by location)
* **Topic-based browsing** (Business, Tech, Sports, Politics, etc.)
* **Search with debounce**
* **Infinite scrolling** with smart pagination
* **Date-sorted relevance**


### 📖 Article Experience
* Smooth **slide-in article reader**
* **Swipe-to-close** on mobile
* Desktop **split-view layout**
* **Read full article** external link
* **Text-to-Speech** (r
ead aloud)
* **Share** via native share or clipboard
* Browser **Back / Swipe gesture closes article**


### 🕘 History & Navigation
* **Recently viewed articles history**
* One-tap reopen from history
* Browser History API integration
* Clean state handling (no broken URLs)


### 🎨 UI & UX
* Modern **glassmorphic design**
* **Dark / Light theme** with persistence
* Mobile-first responsive layout
* Smooth animations & transitions
* Accessible buttons & focus handling


### 👤 User Profile
* Editable username
* Profile dialog
* Secure session handling


---


## 🧠 Tech Stack
| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| Frontend     | Vanilla JavaScript (ES6+)                         |
| Backend      | Node.js + Express                                 |
| Templating   | EJS                                               |
| Database     | MongoDB                                           |
| News Source  | NewsAPI (via backend proxy)                       |
| Styling      | CSS3 (Glassmorphism, CSS variables)               |
| Browser APIs | History API, Speech Synthesis, Web Share          |
| Deployment   | Vercel                                            |


## 🚀 Getting Started

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Dantel/globlit.git
cd globlit
```


### 2️⃣ Install dependencies
```bash
npm install
```


### 3️⃣ Environment Variables
Create a `.env` file and fill out the variables.


### 4️⃣ Run the server
```bash
npm run dev
```
Open in browser:
```
http://localhost:3000
```


## 🔄 How It Works

### News Flow
1. Frontend requests news via `/api/news`
2. Backend proxies requests to NewsAPI
3. Articles are filtered, deduplicated, and sorted
4. Infinite scroll loads more articles dynamically


### Article View Logic
* Opening an article:

  * Animates panel
  * Pushes browser history state
* Closing article:

  * Via back button
  * Swipe gesture
  * Browser back / mobile swipe


### Swipe-to-Close
* Touch start → detect horizontal movement
* Threshold-based dismissal
* Only active when article is open
* Mobile-optimized, desktop-safe


## 🎧 Text-to-Speech
Globlit supports reading articles aloud using the browser’s native Speech Synthesis API.

* Tap **Read**
* Tap again to stop
* Automatically stops on article close


## 📱 Mobile Support
* Swipe gestures
* Full-screen article view
* Responsive navigation
* Touch-friendly UI
* Optimized performance


## 🔐 Security Notes
* News API keys are **never exposed** to the client
* Backend proxy prevents abuse
* User session handling via server routes
* Safe external links (`target="_blank"`)


## 🌱 Future Improvements
* Save articles offline
* User bookmarks
* Account-based personalization
* AI-powered summarization
* Push notifications
* Progressive Web App (PWA)


## 📸 Screenshots
![Globlit Screenshot 1](https://github.com/DantelCode/Globlit/blob/main/screenshots/landing.png)
![Globlit Screenshot 2](https://github.com/DantelCode/Globlit/blob/main/screenshots/signin.png)
![Globlit Screenshot 3](https://github.com/DantelCode/Globlit/blob/main/screenshots/home.png)

## 🧑‍💻 Author

**Chukwunonso Daniel**
Frontend & Full-Stack Developer
* Portfolio: *(add link)*
* Twitter / X: *(add link)*


## 📄 License
MIT License
Feel free to use, modify, and build upon Globlit.


## ⭐ Support
If you like this project:
* ⭐ Star the repo
* 🐛 Report issues
* 💡 Suggest features



**Globlit — News that feels native.** 🌍📰


