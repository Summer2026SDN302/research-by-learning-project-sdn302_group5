import { Container, Row, Col } from "react-bootstrap";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ROUTES, COMPANY } from "../../constants";
import "./Footer.css";

const Footer = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const linkVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    hover: {
      x: 5,
      color: "#13ec37",
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.footer
      className="footer"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <Container>
        <Row className="footer-top">

          {/* Left column */}
          <Col lg={5} md={12} className="footer-col footer-col-brand">
            <motion.div variants={itemVariants} className="footer-brand-block">

              <motion.div
                className="footer-brand-title"
                whileHover={{ scale: 1.02 }}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(ROUTES.HOME)}
              >
                <span className="footer-logo-icon"></span>
                <span className="footer-logo-text">PreOnic</span>
              </motion.div>

              <p className="footer-brand-desc">
                Nền tảng nông nghiệp số kết nối nông dân và doanh nghiệp,
                minh bạch từ mùa vụ đến bàn ăn.
              </p>

              {/* Certification */}
              <div className="footer-cert">
                <span>Chứng nhận đăng ký</span>

                <img
                  src={`${process.env.PUBLIC_URL}/images/products/cert.png`}
                  alt="Đã đăng ký Bộ Công Thương"
                />
              </div>

            </motion.div>
          </Col>

          {/* Middle column */}
          <Col lg={3} md={6} className="footer-col">
            <motion.div variants={itemVariants}>
              <h6>Về chúng tôi</h6>

              <ul>
                {[
                  { label: "Về PreOnic", path: ROUTES.HOME },
                  { label: "Điều khoản sử dụng", path: ROUTES.SOLUTIONS },
                  { label: "Chính sách bảo mật", path: ROUTES.SOLUTIONS }
                ].map((link, index) => (
                  <motion.li
                    key={index}
                    variants={linkVariants}
                    whileHover="hover"
                    onClick={() => navigate(link.path)}
                    style={{ cursor: "pointer" }}
                  >
                    {link.label}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </Col>

          {/* Right column */}
          <Col lg={4} md={6} className="footer-col">
            <motion.div variants={itemVariants}>
              <h6>Hỗ trợ</h6>

              <ul>
                {[
                  { label: "Trung tâm trợ giúp", path: ROUTES.CONTACT },
                  { label: "Hướng dẫn mua hàng", path: ROUTES.CONTACT },
                  { label: "Hướng dẫn bán hàng", path: ROUTES.CONTACT }
                ].map((link, index) => (
                  <motion.li
                    key={index}
                    variants={linkVariants}
                    whileHover="hover"
                    onClick={() => navigate(link.path)}
                    style={{ cursor: "pointer" }}
                  >
                    {link.label}
                  </motion.li>
                ))}
              </ul>

            </motion.div>
          </Col>

        </Row>

        <motion.div
          className="footer-bottom"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          © {COMPANY.COPYRIGHT_YEAR} PreOnic. All rights reserved.
        </motion.div>

      </Container>
    </motion.footer>
  );
};

export default Footer;