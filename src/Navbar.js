import "./style.css";
import logo from './img/logo.svg';
import aboutIcon from './img/aboutIcon.svg';
import contactIcon from './img/contactIcon.svg';
import { Link } from 'react-router-dom';

function Navbar() {
    return (
        <nav>
            <li><Link to="/"><img src={logo} alt="logo" /></Link></li>
            <li>
                <img src={aboutIcon} alt="aboutIcon" />
                <Link to="/about"><h2>About</h2></Link>
            </li>
            <li>
                <img src={contactIcon} alt="contactIcon" />
                <a href="contact.html"><h2>Contact</h2></a>
            </li>
        </nav >
    )
}
export default Navbar;