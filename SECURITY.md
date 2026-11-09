# Security Policy

## 1. Local Security Model (Zero-Leak Guarantee)

**DocProps Studio** is engineered with an uncompromising focus on user privacy:

- **100% Local Processing:** All document operations (ZIP container unpacking, XML parsing, attribute manipulation, and repackaging) occur strictly within local system memory.
- **Zero Network Requirements (No Telemetry / No Network Calls):** The application does not collect or transmit telemetry, analytics, user identifiers, or document contents to any remote server or cloud service.
- **Content Security Policy (CSP):** The application interface enforces `connect-src 'none'`, strictly blocking unauthorized outbound network connections from the renderer process.
- **Zero API Keys or Secrets:** The codebase neither includes nor requires external API tokens, cloud subscriptions, or remote credentials.
- **Process Isolation:** The Electron desktop wrapper runs with robust context isolation (`contextIsolation: true`) and disabled Node.js integration (`nodeIntegration: false`) in the renderer process, communicating only via strictly validated IPC channels.

---

## 2. Reporting Security Vulnerabilities

If you discover a security concern or vulnerability:
- Please submit a private security advisory on GitHub via **Security -> Report a vulnerability**.
- Alternatively, open an issue labeled `[security]` in the repository tracker.

---

## 3. Disclaimer

The application is provided "AS IS" without warranty of any kind under the MIT License. Users remain responsible for adhering to their organization's internal compliance policies when handling sensitive document metadata.
