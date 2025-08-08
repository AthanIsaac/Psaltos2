import "./style.css";
import logo from './img/logo.svg';
import Cross from "./img/icons/cross.js";
import Church from "./img/church.svg";
import jesus from './img/jesus.svg';
import Navbar from "./Navbar.js";
import Footer from "./Footer.js";
import { useTheme } from './ThemeContext.js';

function About() {
    const { isDarkMode } = useTheme();
    
    const HeaderComponent = ({ placeHolder }) => (
        <div className="headerContainer">
            <Cross />
            <h1>{placeHolder}</h1>
            <Cross />
        </div>
    );

    return (
        <div className="mainContainer">
            <div className="backgroundOverlay"></div>
            <div className="contents">
                <Navbar showStickySearch={false} />
                <img className="Jesus" src={jesus} alt="Jesus" />
                <div className="titleContainer">
                    <img className="mainLogo" src={logo} alt="logo" />
                    <span>Psaltos</span>
                </div>
                
                <div className="TabList about-container">
                    <HeaderComponent placeHolder="About Psaltos" />
                    
                    <div className="about-content-wrapper">
                        <h2 className="about-section-title">Our Mission</h2>
                        <p className="about-text">
                            Psaltos is the ultimate search engine designed to house all the hymns in the Coptic Orthodox Church.
                            Our mission is to preserve and make accessible the rich liturgical heritage of the Coptic tradition
                            for current and future generations.
                        </p>
                        
                        <h2 className="about-section-title">What We Offer</h2>
                        <ul className="about-list">
                            <li className="about-list-item">
                                <strong>Comprehensive Hymn Collection:</strong> Access to hymns from various liturgical seasons including Nativity, Resurrection, Theophany, and more.
                            </li>
                            <li className="about-list-item">
                                <strong>Multiple Cantors:</strong> Listen to different interpretations of the same hymn by various Coptic deacons and cantors.
                            </li>
                            <li className="about-list-item">
                                <strong>Seasonal Organization:</strong> Browse hymns by liturgical seasons or by individual cantors.
                            </li>
                            <li className="about-list-item">
                                <strong>Advanced Search:</strong> Find hymns by name, cantor, or season with our powerful search functionality.
                            </li>
                            <li className="about-list-item">
                                <strong>Audio Playback:</strong> High-quality audio streaming with playback controls and speed adjustment.
                            </li>
                            <li className="about-list-item">
                                <strong>Theme Support:</strong> {isDarkMode ? 'Dark' : 'Light'} mode for comfortable viewing in any environment.
                            </li>
                        </ul>
                        
                        <h2 className="about-section-title">Our Vision</h2>
                        <p className="about-text">
                            We envision a world where the beautiful hymns of the Coptic Orthodox Church are easily accessible
                            to anyone seeking to deepen their spiritual journey. Whether you're learning new hymns, preparing
                            for liturgical services, or simply enjoying the sacred music, Psaltos is your companion in faith.
                        </p>
                        
                        <h2 className="about-section-title">Technology</h2>
                        <p className="about-text">
                            Built with modern web technologies including React and advanced audio processing, Psaltos provides
                            a seamless and responsive experience across all devices. Our platform is designed to be intuitive
                            and user-friendly while maintaining the reverence and beauty of the sacred content.
                        </p>
                        
                        <div className="about-quote-section">
                            <p className="about-quote">
                                "Let the word of Christ dwell in you richly, teaching and admonishing one another in all wisdom,
                                singing psalms and hymns and spiritual songs, with thankfulness in your hearts to God."
                            </p>
                            <p className="about-quote-attribution">
                                - Colossians 3:16
                            </p>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
            <img className="churchImg" src={Church} alt="church" />
        </div>
    );
}

export default About;