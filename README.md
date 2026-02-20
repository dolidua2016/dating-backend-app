# 💘 Spark Dating App

A full-stack dating application with real-time chat, smart matching, and user profiles.

## 🚀 Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Real-time:** Socket.io
- **Authentication:** JWT (JSON Web Token)
- **Password Hashing:** bcrypt.js

---

## ✨ Features

- 🔐 User Registration & Login (JWT Auth)
- 👤 Profile Setup (bio, photos, interests, age)
- ❤️ Like / Dislike / Match System
- 💬 Real-time Chat with Socket.io
- 🔔 Match Notifications
- 🔍 Filter by age, location, interests

---


---

## ⚙️ Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/spark-dating-app.git

# 2. Go to project folder
cd spark-dating-app

# 3. Install dependencies
npm install

# 4. Create .env file
cp .env.example .env

# 5. Start the server
npm run dev
```

---

## 🔑 Environment Variables (.env)

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```


## 🛡️ Security

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes with middleware
- Input validation

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.



---

> Made with by [Doli Dua]