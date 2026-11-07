import "./styles/layout.css";
import "./styles/navbar.css";
import "./styles/pages.css";
import Church from "./img/church.svg";
import jesus from './img/jesus.svg';
import Navbar from "./Navbar.js";
import Footer from "./Footer.js";

function About() {
    return (
        <div className="mainContainer">
            <div className="backgroundOverlay"></div>
            <Navbar showStickySearch={false} />
            <div className="contents">
                <img className="Jesus" src={jesus} alt="Jesus" />

                <div className="modern-hymns-page">
                    <div className="hymns-hero-section">
                        <div className="hymns-hero-content">
                            <div className="hymns-hero-badge">About Psaltos</div>
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
                        </div>
                    </div>

                    <div className="hymns-grid-container">
                        <div className="hymns-grid">
                            <div className="hymn-card hymn-card-static">
                                <div className="hymn-card-header">
                                    <div className="hymn-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                </div>
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">What is Psaltos?</h3>
                                    <p className="hymn-card-description">
                                        Psaltos is a search engine for the hymns of the Coptic Orthodox Church.
                                        It was built to give every Coptic Christian — from the lifelong deacon
                                        to someone encountering the liturgy for the first time — a simple way
                                        to find, listen to, and learn the hymns of the church.
                                    </p>
                                </div>
                                <div className="hymn-card-overlay"></div>
                            </div>

                            <div className="hymn-card hymn-card-static">
                                <div className="hymn-card-header">
                                    <div className="hymn-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
                                            <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                    </div>
                                </div>
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">What's Available</h3>
                                    <ul className="hymn-card-list">
                                        <li>Hymns from every liturgical season and feast</li>
                                        <li>Recordings from over 50 cantors and deacons</li>
                                        <li>Search by name, season, or cantor</li>
                                        <li>High-quality audio playback on all devices</li>
                                    </ul>
                                </div>
                                <div className="hymn-card-overlay"></div>
                            </div>

                            <div className="hymn-card hymn-card-static about-scripture-card" style={{gridColumn: 'span 2', minHeight: 'unset'}}>
                                <div className="hymn-card-content">
                                    <p className="hymn-card-description about-scripture-text">
                                        "Let the word of Christ dwell in you richly, teaching and admonishing
                                        one another in all wisdom, singing psalms and hymns and spiritual songs,
                                        with thankfulness in your hearts to God."
                                    </p>
                                    <p className="about-scripture-ref">Colossians 3:16</p>
                                </div>
                                <div className="hymn-card-overlay"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
            <img className="churchImg" src={Church} alt="church" />
        </div>
    );
}

export default About;
