import { API_BASE } from './config.js';
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

            const apiUrl = API_BASE;
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
                    <div className="hymns-hero-section">
                        <div className="hymns-hero-content">
                            <div className="hymns-hero-badge">Contact</div>
                            <p className="page-hero-subtitle">
                                Have feedback, a question, or a hymn to suggest?
                                We typically respond within 24–48 hours.
                            </p>
                        </div>
                    </div>

                    <div className="hymns-grid-container">
                        <div className="hymns-grid">
                            <div className="hymn-card hymn-card-static" style={{gridColumn: 'span 2', minHeight: 'auto'}}>
                                <div className="hymn-card-content">
                                    {submitStatus === 'success' && (
                                        <div className="contact-status-message contact-status-success" style={{marginBottom: '1.5rem'}}>
                                            Message sent — we'll be in touch soon.
                                        </div>
                                    )}

                                    {submitStatus === 'error' && (
                                        <div className="contact-status-message contact-status-error" style={{marginBottom: '1.5rem'}}>
                                            Something went wrong. Please try again or email us directly.
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="contact-form">
                                        <div className="contact-form-row">
                                            <div className="contact-form-field">
                                                <label className="contact-form-label">Name *</label>
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
                                                <label className="contact-form-label">Email *</label>
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
                                            <label className="contact-form-label">Subject *</label>
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
                                            <label className="contact-form-label">Message *</label>
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
                                            <label className="contact-form-label">Attachment (optional)</label>
                                            <input
                                                type="file"
                                                id="file-input"
                                                onChange={handleFileChange}
                                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4"
                                                className="contact-form-file-input"
                                            />
                                            <small className="contact-form-file-note">
                                                Max 10 MB — PDF, DOC, TXT, images, audio, video
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

                            <div className="hymn-card hymn-card-static">
                                <div className="hymn-card-content">
                                    <h3 className="hymn-card-title">Email us directly</h3>
                                    <p className="hymn-card-description">
                                        <a href="mailto:psaltoshymns@gmail.com" style={{color: 'var(--primary-color)'}}>
                                            psaltoshymns@gmail.com
                                        </a>
                                    </p>
                                    <p className="hymn-card-description" style={{marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)'}}>
                                        We reply within 24–48 hours.
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
