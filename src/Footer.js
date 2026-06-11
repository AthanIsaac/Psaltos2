import "./styles/layout.css";
import logo from './img/logo.svg';
import { Link } from 'react-router-dom';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <img src={logo} alt="Psaltos" className="footer-logo" />
                    <span className="footer-brand-name">Psaltos</span>
                </div>
                <div className="footer-nav">
                    <Link to="/">Home</Link>
                    <Link to="/about">About</Link>
                    <Link to="/contact">Contact</Link>
                </div>
            </div>
            <div className="footer-bottom">
                <p>© 2024 Psaltos · Coptic Orthodox Hymns</p>
            </div>
        </footer>
    );
}

export default Footer;
