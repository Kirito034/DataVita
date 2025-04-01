"use client"

// Default templates for different file types
export const DEFAULT_TEMPLATES = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playground</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <h1>Welcome to the Playground</h1>
    <p>Modify the HTML, CSS, or JS to see real-time changes.</p>
    <p><a href="test.html">Go to Test Page</a></p>
  </div>
  <script src="./script.js"></script>
</body>
</html>`,

  test_html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width-device-width, initial-scale=1.0">
  <title>Test Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <h1>Test Page</h1>
    <p>This is a secondary HTML page.</p>
    <p><a href="./index.html">Back to Home</a></p>
  </div>
  <script src="./script.js"></script>
</body>
</html>`,

  css: `/* Reset & Base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
  color: #333;
  text-align: center;
  padding: 2rem;
}

h1 {
  color: #0070f3;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background-color: #0070f3;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: 0.3s;
}

button:hover {
  background-color: #005bb5;
}`,

  javascript: `// Wait for DOM to load before running script
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  
  // Only proceed if the app element exists
  if (app) {
    // Append a new paragraph dynamically
    const paragraph = document.createElement('p');
    paragraph.textContent = 'This paragraph was added dynamically with JavaScript.';
    app.appendChild(paragraph);

    // Create a button that changes content
    const button = document.createElement('button');
    button.textContent = 'Change Text';
    button.onclick = () => {
      paragraph.textContent = 'Button Clicked! Text Changed.';
    };
    app.appendChild(button);
  }

  console.log('JavaScript initialized.');
});`,

  jsx: `import React, { useState } from 'react';

// Button Component
function Button({ onClick, children, color = '#0070f3' }) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        margin: '10px', 
        padding: '10px 20px',
        backgroundColor: color,
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );
}

// Main App Component
export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#0070f3' }}>React JSX Playground</h1>
      <p>Edit this JSX to see changes in real-time.</p>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
      <Button onClick={() => alert('Hello from JSX!')}>Show Alert</Button>
    </div>
  );
}`,

  tsx: `import React, { useState } from 'react';

// TypeScript definitions
type ButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
};

// Button Component with TypeScript
function Button({ onClick, children, color = '#0070f3' }: ButtonProps) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        margin: '10px', 
        padding: '10px 20px',
        backgroundColor: color,
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );
}

// Main App Component
export default function App() {
  const [count, setCount] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: theme === 'light' ? '#ffffff' : '#333333',
      color: theme === 'light' ? '#333333' : '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#0070f3' }}>React TSX Playground</h1>
      <p>Edit this TSX code and see real-time updates.</p>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
      <Button onClick={() => alert('Hello from TSX!')}>Show Alert</Button>
      <Button onClick={toggleTheme} color="#8a2be2">Toggle Theme</Button>
    </div>
  );
}`,

  json: `{
  "name": "playground-project",
  "version": "1.0.0",
  "description": "A code playground project",
  "main": "index.js",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^4.4.9",
    "eslint": "^8.38.0"
  },
  "scripts": {
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}`,
}

// Project templates
export const PROJECT_TEMPLATES = {
  basic: {
    name: "Basic HTML/CSS/JS",
    description: "A simple project with HTML, CSS, and JavaScript",
    files: [
      { name: "index.html", type: "html", content: DEFAULT_TEMPLATES.html, path: "/" },
      { name: "test.html", type: "html", content: DEFAULT_TEMPLATES.test_html, path: "/" },
      { name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      { name: "script.js", type: "javascript", content: DEFAULT_TEMPLATES.javascript, path: "/" },
    ],
  },
  react: {
    name: "React App",
    description: "A React application with JSX",
    files: [
      {
        name: "index.html",
        type: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <!-- React will be loaded automatically -->
</body>
</html>`,
        path: "/",
      },
      { name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      {
        name: "App.jsx",
        type: "jsx",
        content: `import React, { useState } from 'react';
import Header from './Header';
import Footer from './Footer';

function Button({ onClick, children, color = '#0070f3' }) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        margin: '10px', 
        padding: '10px 20px',
        backgroundColor: color,
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app-container">
      <Header title="React Playground" />
      
      <main className="content">
        <h1>Welcome to React</h1>
        <p>This is a React application with components.</p>
        <p>Count: {count}</p>
        <div className="button-group">
          <Button onClick={() => setCount(count + 1)}>Increment</Button>
          <Button onClick={() => setCount(count - 1)} color="#f44336">Decrement</Button>
          <Button onClick={() => setCount(0)} color="#4caf50">Reset</Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}`,
        path: "/",
      },
      {
        name: "Header.jsx",
        type: "jsx",
        content: `import React from 'react';

export default function Header({ title = 'React App' }) {
  return (
    <header style={{
      backgroundColor: '#0070f3',
      color: 'white',
      padding: '1rem',
      textAlign: 'center'
    }}>
      <h1>{title}</h1>
      <nav>
        <ul style={{
          display: 'flex',
          justifyContent: 'center',
          listStyle: 'none',
          gap: '1rem',
          padding: 0
        }}>
          <li><a href="#" style={{ color: 'white' }}>Home</a></li>
          <li><a href="#" style={{ color: 'white' }}>About</a></li>
          <li><a href="#" style={{ color: 'white' }}>Contact</a></li>
        </ul>
      </nav>
    </header>
  );
}`,
        path: "/",
      },
      {
        name: "Footer.jsx",
        type: "jsx",
        content: `import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#333',
      color: 'white',
      padding: '1rem',
      textAlign: 'center',
      marginTop: '2rem'
    }}>
      <p>&copy; {new Date().getFullYear()} React Playground. All rights reserved.</p>
    </footer>
  );
}`,
        path: "/",
      },
      {
        name: "package.json",
        type: "json",
        content: `{
  "name": "react-playground-app",
  "version": "1.0.0",
  "description": "A React application created in the playground",
  "main": "index.js",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^4.4.9"
  },
  "scripts": {
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}`,
        path: "/",
      },
    ],
  },
  reactRouter: {
    name: "React Router App",
    description: "A React application with React Router for navigation",
    files: [
      {
        name: "index.html",
        type: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Router App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <!-- React and React Router will be loaded automatically -->
</body>
</html>`,
        path: "/",
      },
      { name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      {
        name: "App.jsx",
        type: "jsx",
        content: `import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header>
          <h1>React Router App</h1>
          <nav>
            <ul style={{ display: 'flex', gap: '1rem', listStyle: 'none', padding: 0 }}>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </nav>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <footer>
          <p>&copy; {new Date().getFullYear()} React Router App</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}`,
        path: "/",
      },
      {
        name: "Home.jsx",
        type: "jsx",
        content: `import React from 'react';

export default function Home() {
  return (
    <div>
      <h2>Home Page</h2>
      <p>Welcome to the home page of our React Router application.</p>
    </div>
  );
}`,
        path: "/pages",
      },
      {
        name: "About.jsx",
        type: "jsx",
        content: `import React from 'react';

export default function About() {
  return (
    <div>
      <h2>About Page</h2>
      <p>This is the about page of our React Router application.</p>
      <p>Learn more about our company and mission here.</p>
    </div>
  );
}`,
        path: "/pages",
      },
      {
        name: "Contact.jsx",
        type: "jsx",
        content: `import React, { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    alert(\`Thank you for your message, \${formData.name}! We'll get back to you soon.\`);
    setFormData({ name: '', email: '', message: '' });
  };
  
  return (
    <div>
      <h2>Contact Page</h2>
      <p>Get in touch with us using the form below:</p>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="message" style={{ display: 'block', marginBottom: '0.5rem' }}>Message:</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows="4"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        
        <button 
          type="submit"
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#0070f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Send Message
        </button>
      </form>
    </div>
  );
}`,
        path: "/pages",
      },
      {
        name: "NotFound.jsx",
        type: "jsx",
        content: `import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>404 - Page Not Found</h2>
      <p>The page you are looking for doesn't exist or has been moved.</p>
      <p>
        <Link to="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          Go back to the home page
        </Link>
      </p>
    </div>
  );
}`,
        path: "/pages",
      },
      {
        name: "package.json",
        type: "json",
        content: `{
  "name": "react-router-app",
  "version": "1.0.0",
  "description": "A React Router application created in the playground",
  "main": "index.js",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.16.0"
  },
  "devDependencies": {
    "vite": "^4.4.9",
    "@vitejs/plugin-react": "^4.0.4"
  },
  "scripts": {
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}`,
        path: "/",
      },
    ],
  },
  vite: {
    name: "Vite React App",
    description: "A React application with Vite for fast development",
    files: [
      {
        name: "index.html",
        type: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vite React App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/main.jsx"></script>
</body>
</html>`,
        path: "/",
      },
      {
        name: "main.jsx",
        type: "jsx",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        path: "/",
      },
      { name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      {
        name: "App.jsx",
        type: "jsx",
        content: `import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Button from './components/Button';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app-container">
      <Header title="Vite React Playground" />
      
      <main className="content">
        <h1>Welcome to Vite + React</h1>
        <p>This is a React application with Vite for fast development.</p>
        <p>Count: {count}</p>
        <div className="button-group">
          <Button onClick={() => setCount(count + 1)}>Increment</Button>
          <Button onClick={() => setCount(count - 1)} color="#f44336">Decrement</Button>
          <Button onClick={() => setCount(0)} color="#4caf50">Reset</Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}`,
        path: "/",
      },
      {
        name: "Button.jsx",
        type: "jsx",
        content: `import React from 'react';

export default function Button({ onClick, children, color = '#0070f3' }) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        margin: '10px', 
        padding: '10px 20px',
        backgroundColor: color,
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );
}`,
        path: "/components",
      },
      {
        name: "Header.jsx",
        type: "jsx",
        content: `import React from 'react';

export default function Header({ title = 'Vite React App' }) {
  return (
    <header style={{
      backgroundColor: '#0070f3',
      color: 'white',
      padding: '1rem',
      textAlign: 'center'
    }}>
      <h1>{title}</h1>
      <nav>
        <ul style={{
          display: 'flex',
          justifyContent: 'center',
          listStyle: 'none',
          gap: '1rem',
          padding: 0
        }}>
          <li><a href="#" style={{ color: 'white' }}>Home</a></li>
          <li><a href="#" style={{ color: 'white' }}>About</a></li>
          <li><a href="#" style={{ color: 'white' }}>Contact</a></li>
        </ul>
      </nav>
    </header>
  );
}`,
        path: "/components",
      },
      {
        name: "Footer.jsx",
        type: "jsx",
        content: `import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#333',
      color: 'white',
      padding: '1rem',
      textAlign: 'center',
      marginTop: '2rem'
    }}>
      <p>&copy; {new Date().getFullYear()} Vite React Playground. All rights reserved.</p>
    </footer>
  );
}`,
        path: "/components",
      },
      {
        name: "package.json",
        type: "json",
        content: `{
  "name": "vite-react-playground-app",
  "version": "1.0.0",
  "description": "A Vite React application created in the playground",
  "type": "module",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^4.4.9",
    "@vitejs/plugin-react": "^4.0.4"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}`,
        path: "/",
      },
      {
        name: "vite.config.js",
        type: "javascript",
        content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
});`,
        path: "/",
      },
    ],
  },
  multipage: {
    name: "Multi-page Application",
    description: "A multi-page web application with routing",
    files: [
      {
        name: "index.html",
        type: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multi-Page App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <script src="app.js" type="module"></script>
</body>
</html>`,
        path: "/",
      },
      { name: "styles.css", type: "css", content: DEFAULT_TEMPLATES.css, path: "/" },
      {
        name: "app.js",
        type: "javascript",
        content: `// Main application entry point
import { Router } from './router.js';
import { HomePage } from './pages/home.js';
import { AboutPage } from './pages/about.js';
import { ContactPage } from './pages/contact.js';

// Initialize the router
const router = new Router(document.getElementById('app'));

// Register routes
router.addRoute('/', HomePage);
router.addRoute('/about', AboutPage);
router.addRoute('/contact', ContactPage);

// Start the router
router.navigate(window.location.hash.slice(1) || '/');

// Listen for navigation events
window.addEventListener('hashchange', () => {
  router.navigate(window.location.hash.slice(1) || '/');
});

console.log('App initialized');`,
        path: "/",
      },
      {
        name: "router.js",
        type: "javascript",
        content: `// Simple router implementation
export class Router {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.routes = {};
  }
  
  addRoute(path, component) {
    this.routes[path] = component;
  }
  
  navigate(path) {
    console.log(\`Navigating to: \${path}\`);
    
    // Find the component for this route
    const Component = this.routes[path] || this.routes['/'];
    
    if (!Component) {
      console.error(\`Route not found: \${path}\`);
      return;
    }
    
    // Clear the root element
    this.rootElement.innerHTML = '';
    
    // Instantiate and render the component
    const component = new Component();
    this.rootElement.appendChild(component.render());
    
    // Update the URL hash
    window.location.hash = path;
  }
}`,
        path: "/",
      },
      {
        name: "home.js",
        type: "javascript",
        content: `// Home page component
import { Header } from '../components/header.js';
import { Footer } from '../components/footer.js';

export class HomePage {
  render() {
    const container = document.createElement('div');
    container.className = 'page';
    
    // Add header
    const header = new Header();
    container.appendChild(header.render());
    
    // Add content
    const content = document.createElement('div');
    content.className = 'container';
    content.innerHTML = \`
      <h1>Welcome to the Home Page</h1>
      <p>This is a multi-page application built with vanilla JavaScript.</p>
      <p>Use the navigation links to explore different pages.</p>
      <button id="about-btn">Learn More</button>
    \`;
    container.appendChild(content);
    
    // Add footer
    const footer = new Footer();
    container.appendChild(footer.render());
    
    // Add event listeners
    setTimeout(() => {
      const aboutBtn = container.querySelector('#about-btn');
      if (aboutBtn) {
        aboutBtn.addEventListener('click', () => {
          window.location.hash = '/about';
        });
      }
    }, 0);
    
    return container;
  }
}`,
        path: "/pages",
      },
      {
        name: "about.js",
        type: "javascript",
        content: `// About page component
import { Header } from '../components/header.js';
import { Footer } from '../components/footer.js';

export class AboutPage {
  render() {
    const container = document.createElement('div');
    container.className = 'page';
    
    // Add header
    const header = new Header();
    container.appendChild(header.render());
    
    // Add content
    const content = document.createElement('div');
    content.className = 'container';
    content.innerHTML = \`
      <h1>About Us</h1>
      <p>This is the about page of our multi-page application.</p>
      <p>We're demonstrating how to create a simple router and component system.</p>
      <button id="contact-btn">Contact Us</button>
    \`;
    container.appendChild(content);
    
    // Add footer
    const footer = new Footer();
    container.appendChild(footer.render());
    
    // Add event listeners
    setTimeout(() => {
      const contactBtn = container.querySelector('#contact-btn');
      if (contactBtn) {
        contactBtn.addEventListener('click', () => {
          window.location.hash = '/contact';
        });
      }
    }, 0);
    
    return container;
  }
}`,
        path: "/pages",
      },
      {
        name: "contact.js",
        type: "javascript",
        content: `// Contact page component
import { Header } from '../components/header.js';
import { Footer } from '../components/footer.js';

export class ContactPage {
  render() {
    const container = document.createElement('div');
    container.className = 'page';
    
    // Add header
    const header = new Header();
    container.appendChild(header.render());
    
    // Add content
    const content = document.createElement('div');
    content.className = 'container';
    content.innerHTML = \`
      <h1>Contact Us</h1>
      <p>This is the contact page of our multi-page application.</p>
      <form id="contact-form">
        <div style="margin-bottom: 1rem;">
          <label for="name" style="display: block; margin-bottom: 0.5rem;">Name</label>
          <input type="text" id="name" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label for="email" style="display: block; margin-bottom: 0.5rem;">Email</label>
          <input type="email" id="email" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label for="message" style="display: block; margin-bottom: 0.5rem;">Message</label>
          <textarea id="message" rows="4" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;"></textarea>
        </div>
        <button type="submit">Send Message</button>
      </form>
    \`;
    container.appendChild(content);
    
    // Add footer
    const footer = new Footer();
    container.appendChild(footer.render());
    
    // Add event listeners
    setTimeout(() => {
      const form = container.querySelector('#contact-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = form.querySelector('#name').value;
          const email = form.querySelector('#email').value;
          const message = form.querySelector('#message').value;
          
          console.log('Form submitted:', { name, email, message });
          alert(\`Thank you, \${name}! Your message has been sent.\`);
          
          // Navigate back to home
          window.location.hash = '/';
        });
      }
    }, 0);
    
    return container;
  }
}`,
        path: "/pages",
      },
      {
        name: "header.js",
        type: "javascript",
        content: `// Header component
export class Header {
  render() {
    const header = document.createElement('header');
    header.innerHTML = \`
      <nav>
        <div class="container">
          <ul>
            <li><a href="#/" class="nav-link">Home</a></li>
            <li><a href="#/about" class="nav-link">About</a></li>
            <li><a href="#/contact" class="nav-link">Contact</a></li>
          </ul>
        </div>
      </nav>
    \`;
    
    return header;
  }
}`,
        path: "/components",
      },
      {
        name: "footer.js",
        type: "javascript",
        content: `// Footer component
export class Footer {
  render() {
    const footer = document.createElement('footer');
    footer.style.backgroundColor = '#333';
    footer.style.color = 'white';
    footer.style.padding = '1rem';
    footer.style.textAlign = 'center';
    footer.style.marginTop = '2rem';
    
    footer.innerHTML = \`
      <div class="container">
        <p>&copy; \${new Date().getFullYear()} Multi-Page App. All rights reserved.</p>
      </div>
    \`;
    
    return footer;
  }
}`,
        path: "/components",
      },
    ],
  },
}

// 🔹 CDN Links for React & Babel (Updated for React 18)
export const CDN_LINKS = {
  react: "https://unpkg.com/react@18/umd/react.development.js",
  reactDom: "https://unpkg.com/react-dom@18/umd/react-dom.development.js",
  reactRouter: "https://unpkg.com/react-router-dom@6.16.0/dist/umd/react-router-dom.production.min.js",
  babel: "https://unpkg.com/@babel/standalone/babel.min.js",
  typescript: "https://unpkg.com/typescript@5.2.0/lib/typescript.js",
  babelCore: "https://unpkg.com/@babel/core@7.22.5/lib/index.js",
  babelPresetReact: "https://unpkg.com/@babel/preset-react@7.22.5/lib/index.js",
  babelPresetEnv: "https://unpkg.com/@babel/preset-env@7.22.5/lib/index.js",
  babelPresetTypescript: "https://unpkg.com/@babel/preset-typescript@7.22.5/lib/index.js",
}

