"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Mail, Phone, Search, ChevronDown, ChevronUp, Clock, ShieldCheck, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { apiUrl } from "../../constants";

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    topic: "Order Status",
    message: ""
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    let newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.message.trim()) newErrors.message = "Message cannot be empty";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(apiUrl("/api/support/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          topic: formData.topic,
          message: formData.message.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Could not send your message. Please try again.");
      }

      setFormSuccess(true);
      setFormData({ name: "", email: "", topic: "Order Status", message: "" });
      toast.success(data?.message || "Message received. We'll reply within 24 hours.");
      setTimeout(() => setFormSuccess(false), 5000);
    } catch (err) {
      console.error("Support form submission failed:", err);
      toast.error(err.message || "Could not send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [trackingId, setTrackingId] = useState("");
  const [trackingError, setTrackingError] = useState("");

  const handleTrack = () => {
    if (!trackingId.trim()) {
      setTrackingError("Enter an order ID");
    } else if (trackingId.length < 5) {
      setTrackingError("Invalid ID format");
    } else {
      setTrackingError("");
      alert(`Tracking order: ${trackingId}`);
    }
  };

  const faqs = [
    {
      question: "How do I track my order?",
      answer: "Once your order is shipped, you will receive an SMS and email with the tracking link. You can also track it directly from your 'Orders' section in your profile."
    },
    {
      question: "What is your return policy?",
      answer: "We offer a 7-day hassle-free return policy for unopened and unused products. If you receive a damaged product, please contact us within 24 hours of delivery."
    },
    {
      question: "How long does delivery take?",
      answer: "Standard delivery takes 3-5 business days across India. Express delivery (available in select metros) takes 24-48 hours."
    },
    {
      question: "Are Ruvia products safe for sensitive skin?",
      answer: "Yes! All Ruvia products are dermatologist-tested, pH-balanced, and specifically formulated to be gentle yet effective on all skin types, including sensitive skin."
    },
    {
      question: "Do you ship internationally?",
      answer: "Currently, we only ship within India. We are working on bringing Ruvia to the global market very soon!"
    }
  ];

  const contactMethods = [
    {
      icon: <MessageCircle className="text-[#25D366]" size={24} />,
      title: "WhatsApp Us",
      desc: "Fastest way to get help",
      action: "Chat Now",
      link: "https://wa.me/919610006695",
      color: "border-[#25D366]/20 hover:border-[#25D366] bg-[#25D366]/5"
    },
    {
      icon: <Mail className="text-brand-pink" size={24} />,
      title: "Email Support",
      desc: "Response within 24 hours",
      action: "Send Email",
      // Open Gmail's web compose pre-filled with the recipient. This avoids
      // relying on the OS default mailto handler (Outlook/Mail app on
      // Windows). For users not signed into Gmail, Google redirects them
      // to login first, then back to compose.
      link: "https://mail.google.com/mail/?view=cm&fs=1&to=info@ruviacosmetics.com&su=Ruvia%20Cosmetics%20Support",
      color: "border-brand-pink/20 hover:border-brand-pink bg-brand-pink/5"
    },
    {
      icon: <Phone className="text-brand-dark" size={24} />,
      title: "Call Hotline",
      desc: "Mon-Sat, 9am - 7pm",
      action: "Call Us",
      link: "tel:+919610006695",
      color: "border-brand-dark/20 hover:border-brand-dark bg-brand-dark/5"
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-32 pb-20 bg-[#FDFBF7] font-sans selection:bg-brand-pink/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tighter text-brand-dark mb-6">Help & Support</h1>
          <p className="text-brand-dark/60 max-w-2xl mx-auto text-sm md:text-base font-medium leading-relaxed mb-10">
            We're here to ensure your Ruvia experience is as flawless as your skin. Search our help center or reach out to our dedicated support team.
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search size={18} className="text-brand-dark/30" />
            </div>
            <input 
              type="text" 
              placeholder="Search for shipping, returns, or product care..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white border border-brand-dark/10 rounded-2xl text-sm focus:outline-none focus:border-brand-pink focus:ring-1 focus:ring-brand-pink shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Quick Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {contactMethods.map((method, idx) => (
            <a 
              key={idx} 
              href={method.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-8 rounded-4xl border transition-all duration-500 group flex flex-col items-center text-center ${method.color}`}
            >
              <div className="mb-6 transform group-hover:scale-110 transition-transform duration-500">
                {method.icon}
              </div>
              <h3 className="font-serif text-xl font-bold text-brand-dark mb-2">{method.title}</h3>
              <p className="text-xs text-brand-dark/50 font-medium mb-6">{method.desc}</p>
              <span className="text-[10px] font-black tracking-widest uppercase text-brand-dark group-hover:text-brand-pink transition-colors flex items-center gap-2">
                {method.action} <ExternalLink size={12} />
              </span>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* FAQ Section */}
          <div className="lg:col-span-7">
            <h2 className="font-serif text-3xl font-bold text-brand-dark mb-8 flex items-center gap-3">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white border border-brand-dark/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <button 
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full px-6 py-5 flex justify-between items-center text-left"
                    >
                      <span className="text-sm font-bold text-brand-dark pr-4">{faq.question}</span>
                      {openFaq === idx ? <ChevronUp size={16} className="text-brand-pink shrink-0" /> : <ChevronDown size={16} className="text-brand-dark/30 shrink-0" />}
                    </button>
                    <div className={`px-6 transition-all duration-300 ease-in-out ${openFaq === idx ? "pb-6 max-h-40" : "max-h-0 overflow-hidden"}`}>
                      <p className="text-xs text-brand-dark/60 font-medium leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center bg-white border border-dashed border-brand-dark/10 rounded-2xl">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-dark/40">No matching questions found.</p>
                </div>
              )}
            </div>
            
            <div className="mt-12 p-6 md:p-10 bg-brand-dark rounded-4xl md:rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <h3 className="font-serif text-2xl md:text-3xl font-bold text-white mb-2 relative z-10">Track Your Package</h3>
              <p className="text-white/60 text-[10px] md:text-xs font-medium mb-8 relative z-10">Enter your order ID to see real-time updates.</p>
              <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                <div className="flex-1 space-y-1">
                  <input 
                    type="text" 
                    placeholder="Order ID (e.g. ORD-1234)" 
                    className={`w-full bg-white/10 border rounded-xl px-5 py-4 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all ${trackingError ? 'border-red-400' : 'border-white/20 focus:border-brand-pink'}`}
                    value={trackingId}
                    onChange={(e) => {
                      setTrackingId(e.target.value);
                      if (trackingError) setTrackingError("");
                    }}
                  />
                  {trackingError && <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest ml-1">{trackingError}</p>}
                </div>
                <Button 
                  variant="secondary" 
                  className="px-8 py-4 text-[10px] rounded-xl whitespace-nowrap justify-center h-13"
                  onClick={handleTrack}
                >
                  Track Order
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-brand-dark/5 border border-brand-dark/5 sticky top-32">
              <h2 className="font-serif text-3xl font-bold text-brand-dark mb-2">Write to us</h2>
              <p className="text-xs text-brand-dark/50 font-medium mb-8">Can't find what you're looking for? Leave a message.</p>
              
              {formSuccess && (
                <div className="mb-6 p-4 bg-[#52C234]/10 border border-[#52C234]/20 rounded-2xl flex items-center gap-3 animate-fade-in">
                  <ShieldCheck size={18} className="text-[#52C234]" />
                  <p className="text-[#52C234] text-xs font-bold uppercase tracking-widest">Message sent successfully!</p>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-brand-dark/40 mb-2 block">Full Name</label>
                  <input 
                    type="text" 
                    className={`w-full bg-[#FDFBF7] border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${errors.name ? 'border-red-400 focus:border-red-400' : 'border-brand-dark/5 focus:border-brand-pink'}`}
                    placeholder="Your full name" 
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      if (errors.name) setErrors({...errors, name: ""});
                    }}
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1 uppercase tracking-widest">{errors.name}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-brand-dark/40 mb-2 block">Email Address</label>
                  <input 
                    type="email" 
                    className={`w-full bg-[#FDFBF7] border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${errors.email ? 'border-red-400 focus:border-red-400' : 'border-brand-dark/5 focus:border-brand-pink'}`}
                    placeholder="you@example.com" 
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({...formData, email: e.target.value});
                      if (errors.email) setErrors({...errors, email: ""});
                    }}
                  />
                  {errors.email && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1 uppercase tracking-widest">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-brand-dark/40 mb-2 block">Topic</label>
                  <select 
                    className="w-full bg-[#FDFBF7] border border-brand-dark/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-pink transition-colors appearance-none cursor-pointer"
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                  >
                    <option>Order Status</option>
                    <option>Returns & Refunds</option>
                    <option>Product Inquiry</option>
                    <option>Collaborations</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-brand-dark/40 mb-2 block">Message</label>
                  <textarea 
                    rows="4" 
                    className={`w-full bg-[#FDFBF7] border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none ${errors.message ? 'border-red-400 focus:border-red-400' : 'border-brand-dark/5 focus:border-brand-pink'}`}
                    placeholder="Describe your query in detail..."
                    value={formData.message}
                    onChange={(e) => {
                      setFormData({...formData, message: e.target.value});
                      if (errors.message) setErrors({...errors, message: ""});
                    }}
                  ></textarea>
                  {errors.message && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1 uppercase tracking-widest">{errors.message}</p>}
                </div>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-full justify-center py-4 rounded-xl shadow-lg shadow-brand-dark/20 mt-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>

              <div className="mt-10 pt-8 border-t border-brand-dark/5 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-[10px] font-bold text-brand-dark/60">
                  <ShieldCheck size={16} className="text-[#52C234]" />
                  <span>Your data is protected by SSL encryption</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-brand-dark/60">
                  <Clock size={16} className="text-brand-pink" />
                  <span>Average response time: 4-6 hours</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
