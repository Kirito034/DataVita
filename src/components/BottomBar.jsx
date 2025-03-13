import React, { useState } from 'react';
import '../styles/BottomBar.css';
import axios from 'axios';  // Ensure you have axios installed

function BottomBar() {
    const [command, setCommand] = useState('');
    const [output, setOutput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInstall = async () => {
        if (!command) {
            setOutput("Please enter a library name.");
            return;
        }

        setIsLoading(true);
        setOutput(`Installing ${command}...`);

        try {
            // Send request to your backend to install the library
            const response = await axios.post('http://localhost:5000/python/install_library', {  // Updated URL
                package_name: command,
            });

            // Update output based on the response
            setOutput(response.data.message || `Successfully installed ${command}`);
        } catch (error) {
            // In case of error, display the error message
            setOutput(`Failed to install ${command}: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bottom-bar">
            <input
                type="text"
                placeholder="Enter library to install"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
            />
            <button onClick={handleInstall} disabled={isLoading}>
                {isLoading ? 'Installing...' : 'Install'}
            </button>
            <div className="output">{output}</div>
        </div>
    );
}

export default BottomBar;
