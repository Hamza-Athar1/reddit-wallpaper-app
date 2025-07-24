# Wall-IT 📱🖼️

A beautiful, modern React Native wallpaper app that fetches high-quality images from Reddit's most popular wallpaper communities. Built with Expo Router and TypeScript.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey.svg)
![React Native](https://img.shields.io/badge/React%20Native-0.76-blue.svg)
![Expo](https://img.shields.io/badge/Expo-53.0-black.svg)

## ✨ Features

### 🏠 Core Functionality

- **Browse Hot Wallpapers**: Discover trending wallpapers from popular Reddit communities
- **Smart Search**: Search across multiple subreddits with advanced filtering options
- **Favorites Management**: Save, organize, and manage your favorite wallpapers
- **High-Quality Previews**: Optimized image loading with progressive enhancement
- **One-Tap Download**: Save wallpapers directly to your device's photo library

### 🎨 User Experience

- **Dark/Light Theme**: Automatic theme switching with manual override
- **Responsive Design**: Optimized layouts for phones and tablets
- **Smooth Animations**: Fluid transitions and micro-interactions
- **Infinite Scroll**: Seamless browsing experience with pagination
- **Image Preview**: Full-screen preview with zoom capabilities

### 🔧 Advanced Features

- **Subreddit Management**: Add/remove custom subreddit sources
- **Search Filters**: Filter by resolution, aspect ratio, and subreddit
- **Search History**: Quick access to previous searches
- **Persistent Storage**: All favorites and settings saved locally
- **Cross-Platform**: Works on iOS, Android, and Web

## 📱 Screenshots

_Add screenshots of your app here_

## 🚀 Quick Start

### Prerequisites

- Node.js (14.x or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- For iOS: Xcode (Mac only)
- For Android: Android Studio

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Hamza-Athar1/reddit-wallpaper-app.git
   cd reddit-wallpaper-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**

   ```bash
   npx expo start
   ```

4. **Run on your device**
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the terminal or open http://localhost:8081

## 🏗️ Project Structure

```
reddit-wallpaper-app/
├── app/                          # App screens and navigation
│   ├── (tabs)/                   # Tab-based navigation
│   │   ├── index.tsx             # Home screen (hot wallpapers)
│   │   ├── search.tsx            # Search functionality
│   │   ├── favorites.tsx         # Favorites management
│   │   └── explore.tsx           # Settings and subreddit management
│   ├── ImagePreviewModal.tsx     # Full-screen image preview
│   └── _layout.tsx               # Root layout with tab navigation
├── components/                   # Reusable UI components
│   ├── ui/                       # Basic UI components
│   ├── WallpaperItem.tsx         # Individual wallpaper card
│   ├── SearchFilters.tsx         # Advanced search filters
│   ├── SearchHistory.tsx         # Search history component
│   ├── ThemeSettings.tsx         # Theme customization
│   └── SettingsContext.tsx       # Global settings state
├── hooks/                        # Custom React hooks
│   ├── useColorScheme.ts         # Theme detection hook
│   └── useDebounce.ts            # Search debouncing hook
├── scripts/                      # Utility scripts
│   └── redditfetch.js            # Reddit API integration
├── constants/                    # App constants and themes
└── assets/                       # Static assets (images, fonts)
```

## 🔧 Configuration

### Environment Setup

The app uses Reddit's public JSON API. No API keys required for basic functionality.

### Customizing Subreddits

Default subreddits are configured in the app. Users can add/remove subreddits via the Settings tab.

Popular wallpaper subreddits included:

- r/wallpapers
- r/earthporn
- r/spaceporn
- r/cityporn
- r/natureporn

## 📚 Technical Details

### Architecture

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context + useState/useReducer
- **Storage**: AsyncStorage for persistence
- **Images**: Expo Image with caching and optimization
- **Styling**: StyleSheet with dynamic theming

### Key Dependencies

```json
{
  "expo": "^53.0.18",
  "expo-router": "~5.1.3",
  "expo-image": "~2.3.2",
  "expo-media-library": "~17.1.7",
  "expo-file-system": "~18.1.11",
  "@react-native-async-storage/async-storage": "^2.1.2"
}
```

### Performance Optimizations

- **Lazy Loading**: Images load progressively as user scrolls
- **Memory Management**: Automatic cleanup of off-screen images
- **Caching**: Intelligent image caching for offline viewing
- **Debouncing**: Search queries debounced to reduce API calls
- **Pagination**: Efficient loading of large datasets

## 🌟 Features Roadmap

### Completed ✅

- [x] Dark/Light theme toggle
- [x] Advanced search with filters
- [x] Favorites management
- [x] High-quality image previews
- [x] Subreddit customization
- [x] Cross-platform support

### In Progress 🚧

- [ ] Collections and playlists
- [ ] Advanced image editing tools
- [ ] Auto wallpaper changer
- [ ] User profiles and social features

### Planned 📋

- [ ] Multiple source integration (Unsplash, Pexels)
- [ ] AI-powered recommendations
- [ ] Live wallpaper support
- [ ] Cloud sync across devices

See [FEATURES_TO_IMPLEMENT.txt](./FEATURES_TO_IMPLEMENT.txt) for the complete roadmap.

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly on both iOS and Android
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow React Native best practices
- Use Expo's built-in APIs when possible
- Write descriptive commit messages
- Test on both platforms before submitting

### Bug Reports

Please include:

- Device information (iOS/Android version)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Reddit API**: For providing free access to wallpaper communities
- **Expo Team**: For the amazing development platform
- **React Native Community**: For the robust ecosystem
- **Wallpaper Communities**: r/wallpapers, r/earthporn, and other creative communities

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Hamza-Athar1/reddit-wallpaper-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Hamza-Athar1/reddit-wallpaper-app/discussions)
- **Email**: [Your Email Here]

## 🔗 Links

- **Demo**: [Live Demo](your-demo-link)
- **App Store**: [Coming Soon]
- **Google Play**: [Coming Soon]
- **Portfolio**: [Your Portfolio](your-portfolio-link)

---

**Made with ❤️ by [Hamza Athar](https://github.com/Hamza-Athar1)**

_Transform your device with stunning wallpapers from Reddit's creative communities!_
