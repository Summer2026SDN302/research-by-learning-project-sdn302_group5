import { Container, Row, Col } from "react-bootstrap";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiFacebook,
  FiYoutube,
  FiMessageCircle,
  FiPhone,
  FiMail,
  FiMapPin,
} from "react-icons/fi";
import { ROUTES, COMPANY } from "../../constants";
import "./Footer.css";

const Footer = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const linkVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    hover: { x: 4, color: "#4ade80", transition: { duration: 0.2 } },
  };

  const quickLinks = [
    { label: "Trang chủ", path: ROUTES.HOME },
    { label: "Sản phẩm", path: ROUTES.PRODUCTS },
    { label: "Giải pháp", path: ROUTES.SOLUTIONS },
    { label: "Liên hệ", path: ROUTES.CONTACT },
  ];

  const solutionLinks = [
    { label: "Giải pháp cho nông dân", path: ROUTES.SOLUTIONS },
    { label: "Giải pháp cho doanh nghiệp", path: ROUTES.SOLUTIONS },
    { label: "Nền tảng công nghệ", path: ROUTES.SOLUTIONS },
  ];

  const supportLinks = [
    { label: "Trung tâm hỗ trợ", path: ROUTES.CONTACT },
    { label: "Hướng dẫn sử dụng", path: ROUTES.CONTACT },
    { label: "Chính sách bảo mật", path: ROUTES.CONTACT },
    { label: "Điều khoản sử dụng", path: ROUTES.CONTACT },
  ];

  const socials = [
    { key: "facebook", icon: <FiFacebook /> },
    { key: "youtube", icon: <FiYoutube /> },
    { key: "zalo", icon: <FiMessageCircle /> },
  ];

  return (
    <motion.footer
      className="footer-v2"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={containerVariants}
    >
      <div className="footer-v2-glow" />
      <Container className="footer-v2-inner">
        <Row className="footer-v2-top g-4">
          {/* BRAND */}
          <Col lg={4} md={6}>
            <motion.div variants={itemVariants} className="footer-v2-brand">
              <div
                className="footer-v2-logo"
                onClick={() => navigate(ROUTES.HOME)}
              >
                <span className="footer-v2-logo-icon" />
                <span className="footer-v2-logo-text">PreOnic</span>
              </div>
              <p className="footer-v2-desc">
                Nền tảng kết nối và bao tiêu
                <br />
                nông sản hàng đầu Việt Nam.
              </p>
              <div className="footer-v2-socials">
                {socials.map((s) => (
                  <motion.span
                    key={s.key}
                    className="footer-v2-social"
                    whileHover={{ y: -3, scale: 1.05 }}
                  >
                    {s.icon}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </Col>

          {/* QUICK LINKS */}
          <Col lg={2} md={6} sm={6}>
            <motion.div variants={itemVariants}>
              <h6 className="footer-v2-heading">Liên kết nhanh</h6>
              <ul className="footer-v2-list">
                {quickLinks.map((l, i) => (
                  <motion.li
                    key={i}
                    variants={linkVariants}
                    whileHover="hover"
                    onClick={() => navigate(l.path)}
                  >
                    {l.label}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </Col>

          {/* SOLUTIONS */}
          <Col lg={2} md={6} sm={6}>
            <motion.div variants={itemVariants}>
              <h6 className="footer-v2-heading">Giải pháp</h6>
              <ul className="footer-v2-list">
                {solutionLinks.map((l, i) => (
                  <motion.li
                    key={i}
                    variants={linkVariants}
                    whileHover="hover"
                    onClick={() => navigate(l.path)}
                  >
                    {l.label}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </Col>

          {/* SUPPORT */}
          <Col lg={2} md={6} sm={6}>
            <motion.div variants={itemVariants}>
              <h6 className="footer-v2-heading">Hỗ trợ</h6>
              <ul className="footer-v2-list">
                {supportLinks.map((l, i) => (
                  <motion.li
                    key={i}
                    variants={linkVariants}
                    whileHover="hover"
                    onClick={() => navigate(l.path)}
                  >
                    {l.label}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </Col>

          {/* CONTACT */}
          <Col lg={2} md={6} sm={6}>
            <motion.div variants={itemVariants}>
              <h6 className="footer-v2-heading">Liên hệ</h6>
              <ul className="footer-v2-list footer-v2-contact">
                <li>
                  <FiPhone className="footer-v2-contact-icon" />
                  {COMPANY.HOTLINE}
                </li>
                <li>
                  <FiMail className="footer-v2-contact-icon" />
                  {COMPANY.EMAIL}
                </li>
                <li>
                  <FiMapPin className="footer-v2-contact-icon" />
                  Đà Lạt, Lâm Đồng, Việt Nam
                </li>
              </ul>
            </motion.div>
          </Col>
        </Row>

        <motion.div
          className="footer-v2-bottom"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          © {COMPANY.COPYRIGHT_YEAR} PreOnic. All rights reserved.
          <span className="footer-v2-leaf-dot" />
        </motion.div>
      </Container>
    </motion.footer>
  );
};

export default Footer;
