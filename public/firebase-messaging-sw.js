importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');
let config = {
        apiKey: "AIzaSyCrl1Bz_vNiExiAy9sK8YCIr8UBLzDbekA",
        authDomain: "rcs-app-b2242.firebaseapp.com",
        projectId: "rcs-app-b2242",
        storageBucket: "rcs-app-b2242.firebasestorage.app",
        messagingSenderId: "942221379972",
        appId: "1:942221379972:web:308313fca5cfe71f5735d1",
        measurementId: "G-6C4ZW6CQBT",
 };
firebase.initializeApp(config);
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/images/default/firebase-logo.png'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});
