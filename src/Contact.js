import "./style.css";
import logo from './img/logo.svg';
import Cross from "./img/icons/cross.js";
import Church from "./img/church.svg";
import jesus from './img/jesus.svg';
import Navbar from "./Navbar.js";
import Footer from "./Footer.js";
import { useState } from 'react';

function Contact() {
    // const { isDarkMode } = useTheme(); // Removed unused variable
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    
    const HeaderComponent = ({ placeHolder }) => (
        <div className="headerContainer">
            <Cross />
            <h1>{placeHolder}</h1>
            <Cross />
        </div>
    );

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

            const response = await fetch('http://localhost:5002/api/contact', {
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
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                
                <div className="TabList contact-container">
                    <HeaderComponent placeHolder="Contact Us" />
                    
                    <div className="contact-form-wrapper">
                        <h2 className="contact-form-title">
                            Get in Touch
                        </h2>
                        <p className="contact-form-description">
                            We'd love to hear from you! Send us your feedback, questions, or suggestions.
                        </p>

                        {submitStatus === 'success' && (
                            <div className="contact-status-message contact-status-success">
                                Thank you for your message! We'll get back to you soon.
                            </div>
                        )}

                        {submitStatus === 'error' && (
                            <div className="contact-status-message contact-status-error">
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

                        <div className="contact-other-methods">
                            <h3>Other Ways to Reach Us</h3>
                            <p>
                                📧 Email: <a href="mailto:psaltoshymns@gmail.com">
                                    psaltoshymns@gmail.com
                                </a>
                            </p>
                            <p className="contact-response-time">
                                We typically respond within 24-48 hours
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

export default Contact;