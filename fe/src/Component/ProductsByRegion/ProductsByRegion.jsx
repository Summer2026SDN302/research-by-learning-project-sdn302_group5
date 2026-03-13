import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import { FiTrendingUp, FiMapPin, FiStar } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { REGIONS, ROUTES } from "../../constants";
import { formatPriceRange } from "../../data/products";
import productService, { resolveImageUrl } from "../../services/product.service";
import "./ProductsByRegion.css";

const regions = [REGIONS.NORTH, REGIONS.CENTRAL, REGIONS.SOUTH];

function ProductsByRegion() {
  const [activeRegion, setActiveRegion] = useState(REGIONS.SOUTH.key);
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    productService.getByRegion(activeRegion)
      .then(res => {
        const list = res?.data?.products || res?.data || [];
        setProducts(list.map(p => ({
          id: p._id || p.id,
          name: p.name,
          location: p.location || "Việt Nam",
          image: resolveImageUrl(p.image) || "/images/products/default.jpg",
          badge: (p.certifications && p.certifications[0]) || p.badge || "Nông sản",
          priceMin: p.priceMin || 0,
          priceMax: p.priceMax || p.priceMin || 0,
          unit: p.unit || "kg",
          progress: p.progress || 0,
          rating: p.rating || 0,
          reviewCount: p.reviewCount || 0,
        })));
      })
      .catch(() => setProducts([]));
  }, [activeRegion]);

  const currentRegion = regions.find((r) => r.key === activeRegion);

  return (
    <section className="products-region-section" id="products-by-region">
      <Container>
        <motion.div
          className="section-header text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="section-badge">Nông sản Việt Nam</span>
          <h2 className="section-title">Sản Phẩm Theo Vùng Miền</h2>
          <p className="section-desc">
            Khám phá nông sản đặc trưng của từng vùng miền trên khắp đất nước
          </p>
        </motion.div>

        {/* Region Tabs */}
        <div className="region-tabs">
          {regions.map((region) => (
            <motion.button
              key={region.key}
              className={`region-tab ${activeRegion === region.key ? "active" : ""}`}
              onClick={() => setActiveRegion(region.key)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                "--region-color": region.color,
                borderColor: activeRegion === region.key ? region.color : "transparent",
                background: activeRegion === region.key ? `${region.color}10` : "transparent",
              }}
            >
              <span className="region-icon">{region.icon}</span>
              <span className="region-label">{region.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Region Description */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRegion}
            className="region-desc-banner"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            style={{ borderLeftColor: currentRegion?.color }}
          >
            <span className="region-desc-icon">{currentRegion?.icon}</span>
            <p>{currentRegion?.highlight}</p>
          </motion.div>
        </AnimatePresence>

        {/* Product Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRegion + "-grid"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Row className="g-4">
              {products.length === 0 && <Col className="text-center py-5" style={{ color: '#888' }}>Chưa có sản phẩm trong vùng này</Col>}
              {products.slice(0, 4).map((product, index) => (
                <Col key={product.id} xs={12} sm={6} lg={3}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className="product-region-card"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <div className="product-region-img-wrap">
                        <Card.Img variant="top" src={product.image} alt={product.name} />
                        <Badge className="product-badge" style={{ background: currentRegion?.color }}>
                          {product.badge}
                        </Badge>
                        {product.progress >= 80 && (
                          <span className="hot-badge"><FiTrendingUp size={11} style={{ marginRight: 3 }} />Sắp hết</span>
                        )}
                      </div>
                      <Card.Body>
                        <div className="product-location"><FiMapPin size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />{product.location}</div>
                        <Card.Title className="product-name">{product.name}</Card.Title>
                        <div className="product-price">{formatPriceRange(product.priceMin, product.priceMax)}/{product.unit}</div>
                        <div className="product-progress-row">
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${product.progress}%`,
                                background: currentRegion?.color,
                              }}
                            />
                          </div>
                          <span className="progress-text">{product.progress}%</span>
                        </div>
                        <div className="product-rating">
                          <FiStar size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} />{product.rating} ({product.reviewCount})
                        </div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.button
            className="btn-view-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(ROUTES.PRODUCTS)}
          >
            Xem tất cả sản phẩm →
          </motion.button>
        </motion.div>
      </Container>
    </section>
  );
}

export default ProductsByRegion;
