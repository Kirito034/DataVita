import React, { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import '../styles/SQLNotebook.css';

const SQLNotebook = () => {
    const [query, setQuery] = useState(''); // SQL query state
    const [status, setStatus] = useState('Idle'); // Execution status
    const [result, setResult] = useState(''); // Result of the SQL query

    // Handle SQL query change
    const handleQueryChange = (value) => {
        setQuery(value);
    };

    // Simulate SQL query execution
    const executeQuery = () => {
        setStatus('Running');
        setResult(''); // Clear previous result

        // Simulate a delay for running the query
        setTimeout(() => {
            // Simulate successful query execution
            setStatus('Finished');
            setResult('Query Executed Successfully!');
        }, 2000);
    };

    return (
        <div className="sql-notebook">
            <div className="editor-container">
                {/* Monaco Editor for SQL Query */}
                <MonacoEditor
                    height="400px"
                    language="sql"
                    value={query}
                    onChange={handleQueryChange}
                    theme="vs-dark"
                    options={{
                        lineNumbers: 'on',
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        autoClosingBrackets: true,
                        scrollbar: { vertical: 'auto' },
                        wrappingIndent: 'same',
                        readOnly: false,
                        lineHeight: 24,
                        padding: { top: 10, bottom: 10 },
                    }}
                />
            </div>

            {/* Execute Button */}
            <button
                className="execute-button"
                onClick={executeQuery}
                disabled={status === 'Running' || query.trim() === ''}
            >
                Execute Query
            </button>

            {/* Status Box */}
            <div className="status-box">
                <span className={`status ${status.toLowerCase()}`}>{status}</span>
            </div>

            {/* Result Box */}
            {status === 'Finished' && result && (
                <div className="result-box">
                    <h4>Result:</h4>
                    <div className="result-content">{result}</div>
                </div>
            )}

            {/* Error handling */}
            {status === 'Error' && (
                <div className="result-box">
                    <h4>Error:</h4>
                    <div className="result-content">There was an issue with the SQL query.</div>
                </div>
            )}
        </div>
    );
};

export default SQLNotebook;
