import "./styles/layout.css";
import "./styles/navbar.css";
import "./styles/pages.css";
import Church from "./img/church.svg";
import jesus from './img/jesus.svg';
import Navbar from "./Navbar.js";
import Footer from "./Footer.js";
import { useState } from 'react';

function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (limit to 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('subject', formData.subject);
            formDataToSend.append('message', formData.message);
            
            if (selectedFile) {
                formDataToSend.append('attachment', selectedFile);
            }

            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002';
            const response = await fetch(`${apiUrl}/api/contact`, {
                method: 'POST',
                body: formDataToSend
            });

            if (response.ok) {
                setSubmitStatus('success');
                setFormData({
                    name: '',
                    email: '',
                    subject: '',
                    message: ''
                });
                setSelectedFile(null);
                // Reset file input
                document.getElementById('file-input').value = '';
            } else {
                setSubmitStatus('error');
                setSelectedFile(null);
                document.getElementById('file-input').value = '';
            }
        } catch {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mainContainer">
            <div className="backgroundOverlay"></div>
            <Navbar showStickySearch={false} />
            <div className="contents">
                <img className="Jesus" src={jesus} alt="Jesus" />

                <div className="modern-hymns-page">
                    {/* Hero Section */}
                    <div className="hymns-hero-section">
                        <div className="hymns-hero-content">
                            <div className="hymns-hero-badge">Contact Us</div>
                            <p className="page-hero-subtitle">
                                Have feedback, a question, or a hymn to suggest? We'd love to hear from you.
                                We typically respond within 24–48 hours.
                            </p>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="hymns-grid-container">
                        <div className="hymns-grid">
                            {/* Contact Form Card */}
                            <div className="hymn-card" style={{gridColumn: 'span 2', minHeight: 'auto'}}>
                                <div className="hymn-card-header">
                                    <div className="hymn-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2"/>
                                            <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                    </div>
                                    <div className="hymn-card-badge">Get in Touch</div>
                                </div>
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">Send us a Message</h3>
                                    <p className="hymn-card-description" style={{marginBottom: '2rem'}}>
                                        We'd love to hear from you! Send us your feedback, questions, or suggestions.
                                    </p>

                                    {submitStatus === 'success' && (
                                        <div className="contact-status-message contact-status-success" style={{marginBottom: '1rem'}}>
                                            Thank you for your message! We'll get back to you soon.
                                        </div>
                                    )}

                                    {submitStatus === 'error' && (
                                        <div className="contact-status-message contact-status-error" style={{marginBottom: '1rem'}}>
                                            Sorry, there was an error sending your message. Please try again.
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="contact-form">
                                        <div className="contact-form-row">
                                            <div className="contact-form-field">
                                                <label className="contact-form-label">
                                                    Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    required
                                                    className="contact-form-input"
                                                    placeholder="Your full name"
                                                />
                                            </div>
                                            <div className="contact-form-field">
                                                <label className="contact-form-label">
                                                    Email *
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    required
                                                    className="contact-form-input"
                                                    placeholder="your.email@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="contact-form-field">
                                            <label className="contact-form-label">
                                                Subject *
                                            </label>
                                            <input
                                                type="text"
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleInputChange}
                                                required
                                                className="contact-form-input"
                                                placeholder="What is this about?"
                                            />
                                        </div>

                                        <div className="contact-form-field">
                                            <label className="contact-form-label">
                                                Message *
                                            </label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleInputChange}
                                                required
                                                rows="6"
                                                className="contact-form-textarea"
                                                placeholder="Tell us what's on your mind..."
                                            />
                                        </div>

                                        <div className="contact-form-field">
                                            <label className="contact-form-label">
                                                Attachment (Optional)
                                            </label>
                                            <input
                                                type="file"
                                                id="file-input"
                                                onChange={handleFileChange}
                                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4"
                                                className="contact-form-file-input"
                                            />
                                            <small className="contact-form-file-note">
                                                Max file size: 10MB. Supported formats: PDF, DOC, TXT, images, audio, video
                                            </small>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="contact-form-submit"
                                        >
                                            {isSubmitting ? 'Sending...' : 'Send Message'}
                                        </button>
                                    </form>
                                </div>
                                <div className="hymn-card-overlay"></div>
                            </div>

                            {/* Contact Info Card */}
                            <div className="hymn-card">
                                <div className="hymn-card-header">
                                    <div className="hymn-card-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22 16.92V19.92C22 20.52 21.52 21 20.92 21C9.4 21 0 11.6 0 0.08C0 -0.52 0.48 -1 1.08 -1H4.08C4.68 -1 5.16 -0.52 5.16 0.08C5.16 2.08 5.44 4.04 6 5.92C6.16 6.4 6 6.92 5.64 7.28L3.12 9.8C4.64 13.04 7.96 16.36 11.2 17.88L13.72 15.36C14.08 15 14.6 14.84 15.08 15C16.96 15.56 18.92 15.84 20.92 15.84C21.52 15.84 22 16.32 22 16.92Z" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                    </div>
                                    <div className="hymn-card-badge">Direct Contact</div>
                                </div>
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">Other Ways to Reach Us</h3>
                                    <p className="hymn-card-description">
                                        📧 Email: <a href="mailto:psaltoshymns@gmail.com" style={{color: 'var(--primary-color)', textDecoration: 'underline'}}>
                                            psaltoshymns@gmail.com
                                        </a>
                                        <br/><br/>
                                        ⏱️ We typically respond within 24-48 hours
                                        <br/><br/>
                                        🔒 All communications are secure and confidential
                                    </p>
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

export default Contact;