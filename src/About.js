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
                
                <div className="modern-hymns-page">
                    {/* Hero Section */}
                    <div className="hymns-hero-section">
                        <div className="hymns-hero-content">
                            <div className="hymns-hero-badge">
                                About Psaltos
                            </div>
                            <div className="hymns-stats">
                                <div className="hymns-stat">
                                    <span className="hymns-stat-number">1000+</span>
                                    <span className="hymns-stat-label">Hymns</span>
                                </div>
                                <div className="hymns-stat">
                                    <span className="hymns-stat-number">50+</span>
                                    <span className="hymns-stat-label">Cantors</span>
                                </div>
                                <div className="hymns-stat">
                                    <span className="hymns-stat-number">20+</span>
                                    <span className="hymns-stat-label">Seasons</span>
                                </div>
                            </div>
                            <button
                                className="hymns-back-button"
                                onClick={() => window.history.back()}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Back to Home
                            </button>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="hymns-grid-container">
                        <div className="hymns-grid">
                            {/* Mission Card */}
                            <div className="hymn-card">
                                <div className="hymn-card-header">
                                    <div className="hymn-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div className="hymn-card-badge">Mission</div>
                                </div>
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">Our Mission</h3>
                                    <p className="hymn-card-description">
                                        Psaltos is the ultimate search engine designed to house all the hymns in the Coptic Orthodox Church.
                                        Our mission is to preserve and make accessible the rich liturgical heritage of the Coptic tradition
                                        for current and future generations.
                                    </p>
                                </div>
                                <div className="hymn-card-overlay"></div>
                            </div>

                            {/* Features Card */}
                            <div className="hymn-card">
                                <div className="hymn-card-header">
                                    <div className="hymn-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div className="hymn-card-badge">Features</div>
                                </div>
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">What We Offer</h3>
                                    <p className="hymn-card-description">
                                        • Comprehensive hymn collection from all liturgical seasons<br/>
                                        • Multiple cantors and interpretations<br/>
                                        • Advanced search functionality<br/>
                                        • High-quality audio playback<br/>
                                        • {isDarkMode ? 'Dark' : 'Light'} mode support
                                    </p>
                                </div>
                                <div className="hymn-card-overlay"></div>
                            </div>

                            {/* Vision Card */}
                            <div className="hymn-card">
                                <div className="hymn-card-header">
                                    <div className="hymn-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                    </div>
                                    <div className="hymn-card-badge">Vision</div>
                                </div>
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">Our Vision</h3>
                                    <p className="hymn-card-description">
                                        We envision a world where the beautiful hymns of the Coptic Orthodox Church are easily accessible
                                        to anyone seeking to deepen their spiritual journey. Whether you're learning new hymns, preparing
                                        for liturgical services, or simply enjoying the sacred music, Psaltos is your companion in faith.
                                    </p>
                                </div>
                                <div className="hymn-card-overlay"></div>
                            </div>

                            {/* Technology Card */}
                            <div className="hymn-card">
                                <div className="hymn-card-header">
                                    <div className="hymn-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                            <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
                                            <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                    </div>
                                    <div className="hymn-card-badge">Technology</div>
                                </div>
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">Modern Technology</h3>
                                    <p className="hymn-card-description">
                                        Built with modern web technologies including React and advanced audio processing, Psaltos provides
                                        a seamless and responsive experience across all devices. Our platform is designed to be intuitive
                                        and user-friendly while maintaining the reverence and beauty of the sacred content.
                                    </p>
                                </div>
                                <div className="hymn-card-overlay"></div>
                            </div>

                            {/* Scripture Quote Card */}
                            <div className="hymn-card" style={{gridColumn: 'span 2'}}>
                                <div className="hymn-card-header">
                                    <div className="hymn-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M6.5 2H20V22H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                    </div>
                                    <div className="hymn-card-badge">Scripture</div>
                                </div>
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">Our Foundation</h3>
                                    <p className="hymn-card-description" style={{fontStyle: 'italic', fontSize: '1.1rem', lineHeight: '1.8'}}>
                                        "Let the word of Christ dwell in you richly, teaching and admonishing one another in all wisdom,
                                        singing psalms and hymns and spiritual songs, with thankfulness in your hearts to God."
                                        <br/><br/>
                                        <strong>- Colossians 3:16</strong>
                                    </p>
                                </div>
                                <div className="hymn-card-overlay"></div>
                            </div>
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