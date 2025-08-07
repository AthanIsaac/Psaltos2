import "./style.css";
import logo from './img/logo.svg';
import Cross from "./img/icons/cross.js";
import Church from "./img/church.svg";
import jesus from './img/jesus.svg';
import Navbar from "./Navbar.js";

function About() {
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
                <Navbar />
                <img className="Jesus" src={jesus} alt="Jesus" />
                <div className="titleContainer">
                    <img className="mainLogo" src={logo} alt="logo" />
                    <span>Psaltos</span>
                </div>
                
                <div className="TabList" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <HeaderComponent placeHolder="About Psaltos" />
                    
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        borderRadius: '20px', 
                        padding: '30px', 
                        margin: '20px 0',
                        color: 'white',
                        lineHeight: '1.6'
                    }}>
                        <h2 style={{ color: 'var(--primary-color)', marginBottom: '20px' }}>Our Mission</h2>
                        <p style={{ fontSize: '18px', marginBottom: '20px' }}>
                            Psaltos is the ultimate search engine designed to house all the hymns in the Coptic Orthodox Church. 
                            Our mission is to preserve and make accessible the rich liturgical heritage of the Coptic tradition 
                            for current and future generations.
                        </p>
                        
                        <h2 style={{ color: 'var(--primary-color)', marginBottom: '20px' }}>What We Offer</h2>
                        <ul style={{ fontSize: '16px', marginBottom: '20px', paddingLeft: '20px' }}>
                            <li style={{ marginBottom: '10px' }}>
                                <strong>Comprehensive Hymn Collection:</strong> Access to hymns from various liturgical seasons including Nativity, Resurrection, Theophany, and more.
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                <strong>Multiple Cantors:</strong> Listen to different interpretations of the same hymn by various Coptic deacons and cantors.
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                <strong>Seasonal Organization:</strong> Browse hymns by liturgical seasons or by individual cantors.
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                <strong>Advanced Search:</strong> Find hymns by name, cantor, or season with our powerful search functionality.
                            </li>
                            <li style={{ marginBottom: '10px' }}>
                                <strong>Audio Playback:</strong> High-quality audio streaming with playback controls and speed adjustment.
                            </li>
                        </ul>
                        
                        <h2 style={{ color: 'var(--primary-color)', marginBottom: '20px' }}>Our Vision</h2>
                        <p style={{ fontSize: '18px', marginBottom: '20px' }}>
                            We envision a world where the beautiful hymns of the Coptic Orthodox Church are easily accessible 
                            to anyone seeking to deepen their spiritual journey. Whether you're learning new hymns, preparing 
                            for liturgical services, or simply enjoying the sacred music, Psaltos is your companion in faith.
                        </p>
                        
                        <h2 style={{ color: 'var(--primary-color)', marginBottom: '20px' }}>Technology</h2>
                        <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                            Built with modern web technologies including React and advanced audio processing, Psaltos provides 
                            a seamless and responsive experience across all devices. Our platform is designed to be intuitive 
                            and user-friendly while maintaining the reverence and beauty of the sacred content.
                        </p>
                        
                        <div style={{ 
                            textAlign: 'center', 
                            marginTop: '40px', 
                            padding: '20px', 
                            background: 'rgba(44, 71, 92, 0.3)', 
                            borderRadius: '15px' 
                        }}>
                            <p style={{ fontSize: '18px', fontStyle: 'italic', margin: 0 }}>
                                "Let the word of Christ dwell in you richly, teaching and admonishing one another in all wisdom, 
                                singing psalms and hymns and spiritual songs, with thankfulness in your hearts to God."
                            </p>
                            <p style={{ fontSize: '14px', marginTop: '10px', opacity: '0.8' }}>
                                - Colossians 3:16
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <img className="churchImg" src={Church} alt="church" />
        </div>
    );
}

export default About;