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
    hover: { x: 4, color: "#16a34a", transition: { duration: 0.2 } },
  };

  const aboutLinks = [
    { label: "Về PreOnic", path: ROUTES.HOME },
    { label: "Kênh người bán", path: ROUTES.FARMER },
    { label: "Điều khoản sử dụng", path: ROUTES.CONTACT },
    { label: "Chính sách bảo mật", path: ROUTES.CONTACT },
    { label: "Quy chế hoạt động", path: ROUTES.CONTACT },
    { label: "Cơ chế giải quyết tranh chấp", path: ROUTES.CONTACT },
  ];

  const supportLinks = [
    { label: "Trung tâm trợ giúp", path: ROUTES.CONTACT },
    { label: "Hướng dẫn mua hàng", path: ROUTES.CONTACT },
    { label: "Hướng dẫn bán hàng", path: ROUTES.CONTACT },
    { label: "Giao hàng và nhận hàng", path: ROUTES.CONTACT },
    { label: "Trả hàng / Hoàn tiền", path: ROUTES.CONTACT },
    { label: "Cổng tiếp nhận & danh sách phản ánh", path: ROUTES.CONTACT },
  ];

  return (
    <motion.footer
      className="footer-v3"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={containerVariants}
    >
      <Container className="footer-v3-inner">
        <Row className="footer-v3-top g-4">
          {/* BRAND + CERT */}
          <Col lg={4} md={12}>
            <motion.div variants={itemVariants} className="footer-v3-brand">
              <div
                className="footer-v3-logo"
                onClick={() => navigate(ROUTES.HOME)}
              >
                <span className="footer-v3-logo-icon" />
                <span className="footer-v3-logo-text">PreOnic</span>
              </div>
              <p className="footer-v3-tagline">Sàn kết nối nông sản giá sỉ</p>
              <p className="footer-v3-desc">
                Được phát triển nhằm kết nối trực tiếp những nhà cung cấp nông
                sản địa phương với nhà hàng, quán ăn, quán cafe và doanh
                nghiệp — mang đến hơn 10.000+ mặt hàng đúng tiêu chuẩn và đảm
                bảo 100% hóa đơn VAT.
              </p>

              <div className="footer-v3-cert">
                <span className="footer-v3-cert-label">Chứng nhận đăng ký</span>
                <img
                  src={`${process.env.PUBLIC_URL}/images/products/cert.png`}
                  alt="Đã đăng ký Bộ Công Thương"
                  className="footer-v3-cert-img"
                />
              </div>
            </motion.div>
          </Col>

          {/* ABOUT */}
          <Col lg={3} md={4} sm={6}>
            <motion.div variants={itemVariants}>
              <h6 className="footer-v3-heading">Về chúng tôi</h6>
              <ul className="footer-v3-list">
                {aboutLinks.map((l, i) => (
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
          <Col lg={3} md={4} sm={6}>
            <motion.div variants={itemVariants}>
              <h6 className="footer-v3-heading">Hỗ trợ</h6>
              <ul className="footer-v3-list">
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
          <Col lg={2} md={4} sm={12}>
            <motion.div variants={itemVariants}>
              <h6 className="footer-v3-heading">Thông tin liên hệ</h6>
              <ul className="footer-v3-list footer-v3-contact-list">
                <li>
                  <span className="footer-v3-contact-label">Hotline:</span>{" "}
                  <strong>{COMPANY.HOTLINE}</strong>
                </li>
                <li>
                  <span className="footer-v3-contact-label">Email:</span>{" "}
                  <strong>{COMPANY.EMAIL}</strong>
                </li>
                <li>
                  <span className="footer-v3-contact-label">Địa chỉ:</span>{" "}
                  <strong>Đà Lạt, Lâm Đồng, Việt Nam</strong>
                </li>
              </ul>
            </motion.div>
          </Col>
        </Row>

        {/* LANDSCAPE ILLUSTRATION */}
        <div className="footer-v3-landscape">
          <svg
            viewBox="0 0 1440 360"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden="true"
          >
            {/* Sun */}
            <circle cx="1180" cy="80" r="46" fill="#fef3c7" opacity="0.7" />
            <circle cx="1180" cy="80" r="32" fill="#fde68a" opacity="0.85" />

            {/* Birds */}
            <g fill="none" stroke="#5b8a72" strokeWidth="2" strokeLinecap="round">
              <path d="M 240 90 q 9 -9 18 0 q 9 -9 18 0" />
              <path d="M 320 120 q 7 -7 14 0 q 7 -7 14 0" />
              <path d="M 200 150 q 6 -6 12 0 q 6 -6 12 0" />
              <path d="M 1080 140 q 9 -9 18 0 q 9 -9 18 0" />
              <path d="M 1020 180 q 7 -7 14 0 q 7 -7 14 0" />
            </g>

            {/* Far hills */}
            <path
              d="M0,210 C200,170 400,225 600,195 C800,165 1000,215 1200,185 C1300,170 1440,200 1440,200 L1440,360 L0,360 Z"
              fill="#cdebbf"
              opacity="0.85"
            />

            {/* Mid hills */}
            <path
              d="M0,250 C180,220 380,260 600,235 C800,210 1000,255 1200,230 C1320,215 1440,245 1440,245 L1440,360 L0,360 Z"
              fill="#a4d989"
              opacity="0.9"
            />

            {/* Front hills */}
            <path
              d="M0,295 C200,265 400,305 700,275 C900,255 1100,305 1440,275 L1440,360 L0,360 Z"
              fill="#7cc265"
            />

            {/* Tree clusters */}
            <g>
              <ellipse cx="120" cy="290" rx="22" ry="18" fill="#3f8d3a" />
              <ellipse cx="140" cy="282" rx="18" ry="14" fill="#4ea24a" />
              <rect x="128" y="290" width="4" height="14" fill="#5b3a1f" />
            </g>
            <g>
              <ellipse cx="880" cy="298" rx="20" ry="16" fill="#3f8d3a" />
              <ellipse cx="900" cy="290" rx="16" ry="12" fill="#4ea24a" />
              <rect x="888" y="298" width="4" height="14" fill="#5b3a1f" />
            </g>

            {/* Farmer figure with watering can */}
            <g transform="translate(1300, 268)">
              {/* hat */}
              <ellipse cx="0" cy="-2" rx="14" ry="4" fill="#d97706" />
              <path d="M -7 -3 Q 0 -12 7 -3 Z" fill="#d97706" />
              {/* body */}
              <rect x="-5" y="1" width="10" height="18" fill="#dbeafe" />
              {/* legs */}
              <rect x="-5" y="19" width="4" height="14" fill="#1f3a2e" />
              <rect x="1" y="19" width="4" height="14" fill="#1f3a2e" />
              {/* arm + watering can */}
              <rect x="5" y="6" width="14" height="3" fill="#dbeafe" />
              <path
                d="M 19 4 L 26 4 L 28 12 L 17 12 Z"
                fill="#16a34a"
              />
              <path d="M 28 6 L 32 4 L 32 8 Z" fill="#16a34a" />
              {/* water drops */}
              <circle cx="30" cy="14" r="1.2" fill="#3b82f6" opacity="0.7" />
              <circle cx="33" cy="18" r="1.2" fill="#3b82f6" opacity="0.7" />
              <circle cx="36" cy="22" r="1.2" fill="#3b82f6" opacity="0.7" />
            </g>

            {/* Rice rows in the front */}
            <g stroke="#5fa450" strokeWidth="1" opacity="0.5">
              <line x1="50" y1="335" x2="350" y2="335" />
              <line x1="100" y1="345" x2="450" y2="345" />
              <line x1="700" y1="338" x2="1100" y2="338" />
              <line x1="800" y1="348" x2="1200" y2="348" />
            </g>
          </svg>
        </div>

        <motion.div
          className="footer-v3-legal"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p>
            Cơ quan chủ quản: <strong>Công ty PreOnic Việt Nam</strong> – Nền
            tảng kết nối và bao tiêu nông sản
          </p>
          <p>
            GCN ĐKKD: 0100109106-478 – Cấp lần đầu: 06/06/2025, Cơ quan cấp: Sở
            Kế hoạch và Đầu tư TP Hà Nội
          </p>
          <p>
            Trụ sở chính:{" "}
            <strong>
              Số 01, phố Giảng Văn Minh, Phường Giảng Võ, Thành phố Hà Nội,
              Việt Nam
            </strong>
          </p>
          <p className="footer-v3-copyright">
            © {COMPANY.COPYRIGHT_YEAR} PreOnic. All rights reserved.
          </p>
        </motion.div>
      </Container>
    </motion.footer>
  );
};

export default Footer;
