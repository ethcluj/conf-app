import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = '/api';

function App() {
  const [value, setValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchValue();
  }, []);

  const fetchValue = async () => {
    try {
      const response = await axios.get(`${API_URL}/value`);
      setValue(response.data.value);
    } catch (err) {
      setError('Failed to fetch value');
    }
  };

  const handleEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API_URL}/value`, { value: editValue });
      setValue(editValue);
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError('Failed to save value');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="App">
      <div className="container">
        <h1>Value Editor</h1>
        {error && <div className="error">{error}</div>}
        {isEditing ? (
          <div className="edit-mode">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <button onClick={handleSave}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div className="view-mode" onClick={handleEdit}>
            <span className="label">Value:</span>
            <span className="value">{value}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 