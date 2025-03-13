import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import { ChevronDown, Home, FileText, Edit3, Eye, Plus, Code, AlignLeft, X, Menu, Github } from 'lucide-react';

const Navbar = ({ 
  activeNotebook, 
  switchNotebook, 
  addCell, 
  undoAction, 
  redoAction, 
  currentDirectory = 'User Workspace',
  openFile,
  fileTabs = [],
  full_name = 'User'
}) => {
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const handleTabClick = (file) => {
    openFile(file);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const dropdownItems = {
    files: [
      { label: 'New Notebook', action: () => {} },
      { label: 'Open Notebook', action: () => {} },
      { label: 'Upload Notebook', action: () => {} },
      { label: 'Save to GitHub', action: () => {}, icon: <Github size={16} /> },
      { label: 'Save', action: () => {}, shortcut: 'Ctrl+S' },
      { label: 'Download', action: () => {} },
      { label: 'Print', action: () => {} },
    ],
    edit: [
      { label: 'Undo', action: undoAction, shortcut: 'Ctrl+Z' },
      { label: 'Redo', action: redoAction, shortcut: 'Ctrl+Y' },
    ],
    view: [
      { label: 'Table of Contents', action: () => {} },
      { label: 'Notebook Info', action: () => {} },
      { label: 'Executed Code History', action: () => {} },
    ],
    insert: [
      { label: 'Code Cell', action: () => addCell('code'), icon: <Code size={16} /> },
    ],
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
        <div className="current-directory" title={currentDirectory}>
          <span>{currentDirectory}</span>
        </div>
      </div>

      <div className={`menu ${isMobileMenuOpen ? 'mobile-open' : ''}`} ref={dropdownRef}>
        <button className="menu-item home-button" onClick={() => navigate('/')}>
          <Home size={16} />
          <span>Home</span>
        </button>

        {Object.keys(dropdownItems).map((key) => (
          <div className="menu-item-container" key={key}>
            <button 
              className={`menu-item ${activeDropdown === key ? 'active' : ''}`} 
              onClick={() => toggleDropdown(key)}
            >
              {key === 'files' && <FileText size={16} />}
              {key === 'edit' && <Edit3 size={16} />}
              {key === 'view' && <Eye size={16} />}
              {key === 'insert' && <Plus size={16} />}
              <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              <ChevronDown 
                size={16} 
                className={`chevron ${activeDropdown === key ? 'rotate' : ''}`} 
              />
            </button>
            {activeDropdown === key && (
              <div className="dropdown">
                {dropdownItems[key].map((item, index) => (
                  <button 
                    key={index} 
                    className="dropdown-item" 
                    onClick={() => {
                      item.action();
                      setActiveDropdown(null);
                    }}
                  >
                    {item.icon && <span className="dropdown-icon">{item.icon}</span>}
                    <span>{item.label}</span>
                    {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="profile" title={full_name}>
        <div className="profile-details">
          <span className="name">{full_name}</span>
        </div>
        <div className="avatar">
          {full_name.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
