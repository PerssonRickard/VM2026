import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "./Header.css";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="site-header">
      <Link to="/" className="site-title">VM <span>2026</span></Link>
      <nav className="header-nav">
        {user ? (
          <>
            <span className="header-user">{user.username} · {user.points_balance} p</span>
            <Link to="/bet" className="header-link">Mina spel</Link>
            <button className="header-btn" onClick={handleLogout}>Logga ut</button>
          </>
        ) : (
          <Link to="/login" className="header-link header-link--cta">Logga in</Link>
        )}
      </nav>
    </header>
  );
}
