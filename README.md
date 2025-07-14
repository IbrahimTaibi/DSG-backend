# DSG Backend

A secure, modular MERN backend for a local services marketplace with authentication, service management, booking, reviews, and real-time chat.

## Features

- Role-based authentication (JWT)
- Service, booking, and review management
- Real-time chat (Socket.io)
- Centralized error handling
- Secure (Helmet, CORS, rate limiting)
- **Advanced product search** (text, filter, sort, paginate)
- **Optimized database queries** (indexes on all major models)

## Setup

1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd DSG Backend
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in required values (MongoDB URI, JWT secret, etc).
4. **Start MongoDB** (if not using a cloud service).
5. **Run the backend:**
   ```sh
   npm start
   # or for development with auto-reload
   npm run dev
   ```

## API Documentation

- REST endpoints are documented using [OpenAPI](./openapi.yaml).
- After setup, visit `/api-docs` for interactive API docs (all endpoints, including advanced search, are documented).
- Socket events are documented below.

## Socket Events

- **send_message**: `{ to, content, orderId? }` — Send a message to another user.
- **receive_message**: `{ sender, receiver, content, order? }` — Receive a message.
- **error**: `string` — Error message for failed actions.

See `socket/chat.js` for event logic and rules.

## Contributing

1. Fork the repo and create your branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -am 'Add new feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a pull request

## License

[MIT](LICENSE)
