import { Container, Button } from "react-bootstrap";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants";
import "./Hero.css";

function Hero() {
  const navigate = useNavigate();
  const heroStyle = {
    backgroundImage: `linear-gradient(rgba(5, 14, 8, 0.42), rgba(5, 14, 8, 0.52)), url(${process.env.PUBLIC_URL}/Vanhomc8.jpg)`,
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { 
        duration: 0.5, 
        type: "spring",
        stiffness: 200 
      }
    }
  };

  const buttonVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    },
    hover: {
      scale: 1.05,
      boxShadow: "0 10px 30px rgba(19, 236, 55, 0.4)",
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.95 }
  };

  return (
    <section className="hero-section" style={heroStyle}>
      <Container>
        <motion.div
          className="hero-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.span 
            className="hero-badge"
            variants={badgeVariants}
          >
            NÔNG NGHIỆP BỀN VỮNG 4.0
          </motion.span>

          <motion.h1 
            className="hero-title"
            variants={itemVariants}
          >
            Đảm Bảo Vụ Mùa,
            <br />
            <motion.span 
              className="highlight"
              initial={{ backgroundSize: "0% 100%" }}
              animate={{ backgroundSize: "100% 100%" }}
              transition={{ duration: 1, delay: 1 }}
            >
              Kết Nối Tương Lai
            </motion.span>
          </motion.h1>

          <motion.p 
            className="hero-desc"
            variants={itemVariants}
          >
            Tham gia cuộc cách mạng nông nghiệp số. Cam kết bao tiêu nông sản
            chất lượng cao và hỗ trợ canh tác bền vững.
          </motion.p>

          <motion.div 
            className="hero-actions"
            variants={itemVariants}
          >
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button 
                className="hero-btn-primary" 
                size="lg"
                onClick={() => navigate(ROUTES.PRODUCTS)}
              >
                Khám phá ngay →
              </Button>
            </motion.div>

            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button 
                className="hero-btn-secondary" 
                size="lg"
                onClick={() => navigate(ROUTES.REGISTER)}
              >
                Đăng ký bán nông sản
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}

export default Hero;
