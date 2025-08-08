import "./style.css";
import logo from './img/logo.svg';
import Cross from "./img/icons/cross.js";
import { Link } from 'react-router-dom';

function Footer() {
    return (
        <div className="footer">
            <nav>
                <li>
                    <Cross />
                    <Link to="/"><img src={logo} alt="logo" /></Link>
                    <Cross />
                </li>
                <li><Link to="/about"><h2>About</h2></Link></li>
                <li><Link to="/contact"><h2>Contact</h2></Link></li>
            </nav>
            <p>Copyright @ 2024 Psaltos | All rights reserved</p>
        </div>
    );
}

export default Footer;