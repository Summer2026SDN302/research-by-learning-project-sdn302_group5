import { Container, Row, Col, Button } from "react-bootstrap";
import { motion } from "framer-motion";
import { FiFeather } from "react-icons/fi";
import "./AgricultureBanner.css";

function AgricultureBanner() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const leftVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const rightVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const statVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <section className="agriculture-banner">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <Row className="align-items-center">
            {/* LEFT CONTENT */}
            <Col lg={6}>
              <motion.div className="banner-content" variants={leftVariants}>
                <h2 className="banner-title">
                  Thúc đẩy minh bạch trong{" "}
                  <span className="highlight">Nông nghiệp hiện đại</span>
                </h2>
                
                <p className="banner-description">
                  PreOnic giúp nông dân kết nối trực tiếp với các thương nhân 
                  và nhà phân phối, cải thiện sự minh bạch và tăng lợi nhuận 
                  bền vững. Cùng với các đối tác đáng tin cậy, chúng tôi hỗ trợ 
                  Hợp tác xã, lên kế hoạch, giám sát và thực hiện các hợp đồng 
                  nông nghiệp hợp lý, bình đẳng cho các bên tham gia.
                </p>

                {/* STATS */}
                <Row className="banner-stats">
                  <Col xs={6}>
                    <motion.div className="stat-box" variants={statVariants}>
                      <h3 className="stat-value">12.5k+</h3>
                      <p className="stat-label">Nông sản trồng</p>
                      <p className="stat-detail">$45M</p>
                      <p className="stat-sublabel">Giá trị giao dịch</p>
                    </motion.div>
                  </Col>
                  <Col xs={6}>
                    <motion.div className="stat-box" variants={statVariants}>
                      <h3 className="stat-value">4.2k+</h3>
                      <p className="stat-label">Nông dân đối tác</p>
                      <p className="stat-detail">100%</p>
                      <p className="stat-sublabel">Hợp đồng hợp lý</p>
                    </motion.div>
                  </Col>
                </Row>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button className="banner-cta">
                    Khám phá nền tảng PreOnic ngay hôm nay
                  </Button>
                </motion.div>
              </motion.div>
            </Col>

            {/* RIGHT IMAGE */}
            <Col lg={6}>
              <motion.div className="banner-image" variants={rightVariants}>
                <div className="chart-container">
                  {/* Growing Chart Illustration */}
                  <div className="chart-bars">
                    {[25, 35, 30, 45, 55, 50, 40, 60, 70, 65, 80, 88].map((height, index) => (
                      <motion.div
                        key={index}
                        className="chart-bar"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        transition={{
                          duration: 0.8,
                          delay: index * 0.1,
                          ease: "easeOut"
                        }}
                        viewport={{ once: true }}
                      >
                        <div className="bar-fill"></div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Decorative Plant Icon */}
                  <motion.div 
                    className="chart-icon"
                    animate={{
                      y: [-5, 5, -5],
                      rotate: [-2, 2, -2]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
>
                    <FiFeather size={32} color="#13ec37" />
                  </motion.div>

                  {/* Background Card */}
                  <div className="chart-card">
                    <div className="card-content">
                      <div className="pulse-dot"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Col>
          </Row>
        </motion.div>
      </Container>
    </section>
  );
}

export default AgricultureBanner;
