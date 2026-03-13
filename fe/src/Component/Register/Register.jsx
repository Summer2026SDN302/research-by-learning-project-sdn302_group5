import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiBriefcase, FiAlertTriangle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Navbar from '../Navbar/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROUTES, TOAST_DURATION } from '../../constants';
import { pageVariants, buttonVariants } from '../../constants/animations';
import { getDistricts, getWards } from '../../data/vn-locations';
import './Register.css';

// Animation variants
const containerVariants = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

const formGroupVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
};


const Register = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { register } = useAuth();
  const [selectedRole, setSelectedRole] = useState('farmer'); // 'farmer' or 'enterprise'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(null); // 'terms' | 'privacy'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  const districtOptions = useMemo(() => getDistricts(formData.province), [formData.province]);
  const wardOptions = useMemo(() => getWards(formData.district), [formData.district]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Reset dependent fields when parent changes
    if (name === 'province') {
      setFormData(prev => ({ ...prev, province: value, district: '', ward: '' }));
      return;
    }
    if (name === 'district') {
      setFormData(prev => ({ ...prev, district: value, ward: '' }));
      return;
    }
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Client-side validation
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!formData.agreeTerms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        province: formData.province,
        district: formData.district,
        ward: formData.ward,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: selectedRole,
        agreeTerms: formData.agreeTerms
      });

      if (response.success) {
        toast.success(`Chào mừng ${formData.fullName}! Tài khoản của bạn đã được tạo thành công.`, TOAST_DURATION.LONG);
        
        setTimeout(() => {
          navigate(selectedRole === 'farmer' ? ROUTES.FARMER : ROUTES.ENTERPRISE);
        }, 1000);
      }
    } catch (err) {
      const errorMessage = err.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="register-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <Navbar />
      
      <main className="register-main">
        <motion.div 
          className="register-container"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {/* Header */}
          <motion.div 
            className="register-header"
            variants={itemVariants}
          >
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Đăng ký tài khoản PreOnic
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              Bắt đầu hành trình kết nối nông nghiệp bền vững cùng hàng ngàn đối tác.
            </motion.p>
          </motion.div>

          {/* Role Selection */}
          <motion.div 
            className="role-selection"
            variants={itemVariants}
          >
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Bạn muốn tham gia với vai trò nào?
            </motion.h3>
            <div className="role-cards">
              {/* Farmer Card */}
              <motion.div 
                className={`role-card ${selectedRole === 'farmer' ? 'selected' : ''}`}
                onClick={() => setSelectedRole('farmer')}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="role-card-bg farmer-bg">
                  <div className="role-card-content">
                    <div className="role-title">
                      <span className="role-icon"><FiUser size={26} /></span>
                      <p>Tôi là Nông dân</p>
                    </div>
                    <p className="role-desc">Tìm kiếm thị trường và quản lý sản xuất hiệu quả.</p>
                  </div>
                </div>
                {selectedRole === 'farmer' && (
                  <div className="check-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                )}
              </motion.div>

              {/* Enterprise Card */}
              <motion.div 
                className={`role-card ${selectedRole === 'enterprise' ? 'selected' : ''}`}
                onClick={() => setSelectedRole('enterprise')}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="role-card-bg enterprise-bg">
                  <div className="role-card-content">
                    <div className="role-title">
                      <span className="role-icon"><FiBriefcase size={26} /></span>
                      <p>Tôi là Doanh nghiệp</p>
                    </div>
                    <p className="role-desc">Kết nối nguồn cung nông sản chất lượng và bền vững.</p>
                  </div>
                </div>
                {selectedRole === 'enterprise' && (
                  <div className="check-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>

          {/* Registration Form */}
          <motion.form 
            className="register-form" 
            onSubmit={handleSubmit}
            variants={itemVariants}
          >
            {/* Error Message */}
            {error && (
              <motion.div 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: '#ffe6e6',
                  border: '1px solid #ff4444',
                  color: '#cc0000',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}
              >
                <FiAlertTriangle size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />{error}
              </motion.div>
            )}

            <div className="form-fields">
              {/* Full Name */}
              <motion.div 
                className="form-group full-width"
                variants={formGroupVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.5 }}
              >
                <label>Họ và tên</label>
                <motion.input
                  type="text"
                  name="fullName"
                  placeholder="Nhập họ và tên của bạn"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  whileFocus={{ scale: 1.01, borderColor: "#13ec37" }}
                />
              </motion.div>

              {/* Email and Phone */}
              <div className="form-row">
                <motion.div 
                  className="form-group"
                  variants={formGroupVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.55 }}
                >
                  <label>Email</label>
                  <motion.input
                    type="email"
                    name="email"
                    placeholder="example@gmail.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    whileFocus={{ scale: 1.01, borderColor: "#13ec37" }}
                  />
                </motion.div>
                <motion.div 
                  className="form-group"
                  variants={formGroupVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.6 }}
                >
                  <label>Số điện thoại</label>
                  <motion.input
                    type="tel"
                    name="phone"
                    placeholder="09xx xxx xxx"
                    value={formData.phone}
                    onChange={handleInputChange}
                    whileFocus={{ scale: 1.01, borderColor: "#13ec37" }}
                  />
                </motion.div>
              </div>

              {/* Province / District / Ward */}
              <div className="form-row">
                <motion.div
                  className="form-group"
                  variants={formGroupVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.62 }}
                >
                  <label>Tỉnh/Thành phố</label>
                  <motion.input
                    type="text"
                    name="province"
                    placeholder="VD: Hà Nội, Lâm Đồng..."
                    value={formData.province}
                    onChange={handleInputChange}
                    whileFocus={{ scale: 1.01, borderColor: "#13ec37" }}
                  />
                </motion.div>
                <motion.div
                  className="form-group"
                  variants={formGroupVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.64 }}
                >
                  <label>Quận/Huyện</label>
                  {districtOptions.length > 0 ? (
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      className="register-select"
                    >
                      <option value="">-- Chọn Quận/Huyện --</option>
                      {districtOptions.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <motion.input
                      type="text"
                      name="district"
                      placeholder="VD: Cầu Giấy, Đà Lạt..."
                      value={formData.district}
                      onChange={handleInputChange}
                      whileFocus={{ scale: 1.01, borderColor: "#13ec37" }}
                    />
                  )}
                </motion.div>
              </div>

              {/* Ward — always shown, dropdown when data available */}
              <motion.div
                className="form-group full-width"
                variants={formGroupVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.66 }}
              >
                <label>Xã/Phường/Thị trấn <span style={{ color: '#999', fontWeight: 400, fontSize: 12 }}>(tùy chọn)</span></label>
                {wardOptions.length > 0 ? (
                  <select
                    name="ward"
                    value={formData.ward}
                    onChange={handleInputChange}
                    className="register-select"
                  >
                    <option value="">-- Chọn Xã/Phường/Thị trấn --</option>
                    {wardOptions.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                ) : (
                  <motion.input
                    type="text"
                    name="ward"
                    placeholder="VD: Phường Dịch Vọng, Xã Xuân Thọ..."
                    value={formData.ward}
                    onChange={handleInputChange}
                    whileFocus={{ scale: 1.01, borderColor: "#13ec37" }}
                  />
                )}
              </motion.div>

              {/* Password and Confirm Password */}
              <div className="form-row">
                <motion.div 
                  className="form-group"
                  variants={formGroupVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.65 }}
                >
                  <label>Mật khẩu</label>
                  <div className="password-input">
                    <motion.input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      whileFocus={{ scale: 1.01 }}
                    />
                    <motion.button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        {showPassword ? (
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                        ) : (
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        )}
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
                <motion.div 
                  className="form-group"
                  variants={formGroupVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.7 }}
                >
                  <label>Xác nhận mật khẩu</label>
                  <div className="password-input">
                    <motion.input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      whileFocus={{ scale: 1.01 }}
                    />
                    <motion.button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        {showConfirmPassword ? (
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                        ) : (
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        )}
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <motion.div 
              className="terms-checkbox"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
            >
              <input
                type="checkbox"
                id="terms"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
              />
              <label htmlFor="terms">
                Tôi đồng ý với <motion.button type="button" className="register-link-btn" onClick={() => setShowModal('terms')} whileHover={{ color: "#13ec37" }}>Điều khoản sử dụng</motion.button> và <motion.button type="button" className="register-link-btn" onClick={() => setShowModal('privacy')} whileHover={{ color: "#13ec37" }}>Chính sách bảo mật</motion.button> của PreOnic.
              </label>
            </motion.div>

            {/* Submit Button */}
            <motion.button 
              type="submit" 
              className="btn-submit"
              variants={buttonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              disabled={loading}
              style={{
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? "Đang xử lý..." : "Tạo tài khoản"}
            </motion.button>

            {/* Login Link */}
            <motion.p 
              className="login-link"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
            >
              Đã có tài khoản? 
              <motion.button 
                type="button" 
                onClick={() => navigate(ROUTES.AUTH)}
                whileHover={{ color: "#13ec37", scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Đăng nhập ngay
              </motion.button>
            </motion.p>
          </motion.form>
        </motion.div>

        <motion.footer 
          className="register-footer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          © 2024 PreOnic. Nền tảng kết nối nông nghiệp bền vững.
        </motion.footer>
      </main>

      {showModal && (
        <div className="terms-modal-overlay" onClick={() => setShowModal(null)}>
          <div className="terms-modal" onClick={e => e.stopPropagation()}>
            <div className="terms-modal-header">
              <h3>{showModal === 'terms' ? 'Điều khoản Sử dụng PreOnic' : 'Chính sách Bảo mật PreOnic'}</h3>
              <button className="terms-modal-close" onClick={() => setShowModal(null)}>✕</button>
            </div>
            <div className="terms-modal-body">
              {showModal === 'terms' ? (
                <>
                  <h4>1. Chấp nhận điều khoản</h4>
                  <p>Bằng việc đăng ký tài khoản trên PreOnic, bạn đồng ý tuân thủ toàn bộ các điều khoản sử dụng này. PreOnic có quyền cập nhật điều khoản bất cứ lúc nào và sẽ thông báo cho người dùng qua email đã đăng ký.</p>
                  <h4>2. Điều kiện sử dụng tài khoản</h4>
                  <p>Bạn phải từ 18 tuổi trở lên và có đủ năng lực pháp lý để sử dụng dịch vụ. Thông tin đăng ký phải trung thực và chính xác. Mỗi cá nhân/tổ chức chỉ được phép sở hữu một tài khoản. Bạn chịu trách nhiệm bảo mật tên đăng nhập và mật khẩu của mình.</p>
                  <h4>3. Hành vi bị cấm</h4>
                  <p>Nghiêm cấm: đăng tải thông tin sai lệch về nông sản; sử dụng nền tảng để lừa đảo, gian lận thương mại; phá hoại hệ thống hoặc cố tình tấn công bảo mật; thu thập thông tin người dùng khác trái phép; vi phạm quyền sở hữu trí tuệ của PreOnic hoặc bên thứ ba.</p>
                  <h4>4. Trách nhiệm của người dùng</h4>
                  <p>Người dùng tự chịu trách nhiệm về tính chính xác của thông tin sản phẩm, hợp đồng và giao dịch. PreOnic chỉ đóng vai trò nền tảng trung gian — không chịu trách nhiệm về chất lượng nông sản thực tế ngoài phạm vi hệ thống Escrow đã cam kết.</p>
                  <h4>5. Quyền sở hữu trí tuệ</h4>
                  <p>Toàn bộ nội dung, giao diện, logo, dữ liệu và mã nguồn của PreOnic đều thuộc quyền sở hữu của Công ty TNHH PreOnic Việt Nam. Nghiêm cấm sao chép, phân phối hoặc sử dụng vì mục đích thương mại khi chưa được phép bằng văn bản.</p>
                  <h4>6. Chấm dứt tài khoản</h4>
                  <p>PreOnic có quyền tạm khóa hoặc xóa vĩnh viễn tài khoản của người dùng vi phạm điều khoản, mà không cần thông báo trước trong các trường hợp khẩn cấp. Bạn có thể tự xóa tài khoản bất kỳ lúc nào qua phần Cài đặt tài khoản.</p>
                  <h4>7. Giới hạn trách nhiệm</h4>
                  <p>PreOnic không chịu trách nhiệm về thiệt hại gián tiếp, mất doanh thu hoặc dữ liệu phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ. Trách nhiệm tối đa của PreOnic không vượt quá tổng phí dịch vụ bạn đã thanh toán trong 12 tháng gần nhất.</p>
                </>
              ) : (
                <>
                  <h4>1. Thông tin chúng tôi thu thập</h4>
                  <p>PreOnic thu thập: (i) Thông tin cá nhân bạn cung cấp khi đăng ký (họ tên, email, số điện thoại, địa chỉ); (ii) Thông tin hoạt động trên nền tảng (giao dịch, hợp đồng, sản phẩm đăng bán); (iii) Dữ liệu kỹ thuật (địa chỉ IP, loại thiết bị, trình duyệt) để cải thiện dịch vụ.</p>
                  <h4>2. Mục đích sử dụng thông tin</h4>
                  <p>Thông tin của bạn được dùng để: xác minh danh tính và tài khoản; thực hiện và bảo vệ các giao dịch qua Escrow; gửi thông báo liên quan đến hợp đồng và tài khoản; cải thiện trải nghiệm người dùng; tuân thủ nghĩa vụ pháp lý.</p>
                  <h4>3. Chia sẻ thông tin</h4>
                  <p>PreOnic <strong>không bán</strong> thông tin cá nhân của bạn. Thông tin chỉ được chia sẻ với: đối tác giao dịch trực tiếp (tên, liên hệ) khi hợp đồng được ký kết; đơn vị thanh toán (PayOS) khi xử lý giao dịch; cơ quan nhà nước khi có yêu cầu hợp pháp.</p>
                  <h4>4. Bảo mật dữ liệu</h4>
                  <p>Dữ liệu của bạn được bảo vệ bằng mã hóa SSL 256-bit trong quá trình truyền tải. Mật khẩu được băm (hashed) bằng thuật toán bcrypt — PreOnic không bao giờ lưu mật khẩu dạng plaintext. Hệ thống được kiểm tra bảo mật định kỳ.</p>
                  <h4>5. Cookie và theo dõi</h4>
                  <p>PreOnic sử dụng cookie phiên làm việc để duy trì trạng thái đăng nhập và cookie phân tích (ẩn danh) để cải thiện hiệu năng hệ thống. Bạn có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng có thể bị ảnh hưởng.</p>
                  <h4>6. Quyền của bạn</h4>
                  <p>Bạn có quyền: truy cập và xuất dữ liệu cá nhân; yêu cầu chỉnh sửa thông tin không chính xác; yêu cầu xóa tài khoản và dữ liệu (trừ dữ liệu hợp đồng phải lưu theo quy định pháp luật); khiếu nại về cách xử lý dữ liệu tới PreOnic hoặc cơ quan bảo vệ dữ liệu.</p>
                  <h4>7. Liên hệ về bảo mật</h4>
                  <p>Nếu phát hiện sự cố bảo mật hoặc có câu hỏi về chính sách này, vui lòng liên hệ: <strong>privacy@preonic.vn</strong> hoặc qua hotline hỗ trợ trên trang web.</p>
                </>
              )}
            </div>
            <div className="terms-modal-footer">
              <button className="cf-btn primary" onClick={() => setShowModal(null)}>Tôi đã hiểu</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Register;
