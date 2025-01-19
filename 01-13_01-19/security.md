# Security Document for Picklers Web Application API

---

## 1. How do you make sure the system is secure and data safe?

To ensure that the system is secure and data remains safe, we implement several layers of security in the development and deployment of the Picklers web application:

- **Input Validation & Sanitization**: We validate and sanitize all user inputs to prevent malicious data from entering the system (e.g., SQL injection, XSS attacks).
- **Authentication & Authorization**: All sensitive endpoints and data are protected with robust authentication and authorization. We use JWT (JSON Web Tokens) for user authentication to ensure only authorized users can access their personal data or perform certain actions.
- **Password Hashing**: All passwords stored in the database are hashed using a secure algorithm like bcrypt to ensure passwords are not stored in plain text.
- **Secure Database Access**: Database credentials and sensitive information are stored securely using environment variables and managed securely with services like Supabase. We do not hardcode passwords or sensitive information directly in the source code.

---

## 2. What data is sensitive?

Sensitive data refers to any information that can be used to personally identify an individual or any data that, if exposed, could cause harm to users or the system. For the Picklers app, the following data types are considered sensitive:

- **Personal Information**: This includes player names, emails, and any other personally identifiable information (PII) stored in the database.
- **Authentication Data**: User credentials (username, email, and password) used for logging into the system.
- **Rankings**: Player ranks and tournament outcomes, though not directly PII, can reveal competitive data.
- **API Tokens**: JWT tokens or session data used for authentication that can be used to impersonate a user.

---

## 3. How will you protect it?

To ensure the protection of sensitive data, the following steps will be implemented:

- **Encryption**: 
  - **Passwords** will be hashed using bcrypt before storing them in the database, so even if the database is compromised, passwords will not be exposed.
  - **HTTPS** will be enforced for all communications between the client and the server to encrypt data in transit, ensuring no eavesdropping.
  
- **Access Control**: 
  - Sensitive routes, such as login or user profile management, will be protected with proper authentication mechanisms like JWT, ensuring only authenticated users can access their data.
  - **Role-based Access Control (RBAC)** will be implemented to ensure users can only access data and perform actions appropriate for their roles (e.g., admin vs. regular user).
  
- **Regular Audits and Penetration Testing**: 
  - Regular security audits will be conducted to ensure that no security vulnerabilities remain in the application.
  - Penetration tests will be used to check for weaknesses, such as SQL injection, XSS, and other common web vulnerabilities.

---

## 4. What specific technologies will you use for protection?

To secure the Picklers API and web application, we will use the following technologies:

- **HTTPS (SSL/TLS)**: We will enforce HTTPS to ensure that all communication between the client and the server is encrypted. This prevents man-in-the-middle attacks and data interception.
- **JWT (JSON Web Tokens)**: We will use JWT for securely transmitting information between the client and server. Tokens will be signed and verified to ensure the integrity of the information and prevent tampering.
- **bcrypt**: bcrypt will be used to hash passwords, making them secure even if the database is compromised.
- **Environment Variables**: All sensitive configuration data, such as database credentials and secret keys, will be stored in environment variables, ensuring they are not exposed in the source code.

---

**End of Security Document**
