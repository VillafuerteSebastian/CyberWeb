import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaBars,
  FaSearch,
  FaTiktok,
  FaUserShield,
} from "react-icons/fa";
import "./navbar.css";
import { categoryData, getCategoryData } from "../../data/categoryData";
import type { CategoryItem } from "../../data/categoryData";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<"categories" | "links">("categories");
  
  const menuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoriesRef = useRef<HTMLDivElement | null>(null);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const homeRoute = "/";

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Load categories dynamically on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategoryData();
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setActiveCategory(categoriesData[0]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to static data
        setCategories(categoryData);
        setActiveCategory(categoryData[0]);
      }
    };

    loadCategories();
  }, []);

  const displayName = useMemo(() => {
    const fullName = user?.nombre_completo?.trim() || "";

    if (!fullName) {
      return user?.correo || "Usuario";
    }

    const parts = fullName.split(/\s+/).filter(Boolean);

    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
    // "Nombre Apellido1 Apellido2" -> nombre + PRIMER apellido, no el segundo.
    if (parts.length === 3) return `${parts[0]} ${parts[1]}`;

    return `${parts[0]} ${parts[parts.length - 2]}`;
  }, [user?.nombre_completo, user?.correo]);

  const clearMenuTimeout = useCallback(() => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
  }, []);

  const clearAdminTimeout = useCallback(() => {
    if (adminTimeoutRef.current) {
      clearTimeout(adminTimeoutRef.current);
      adminTimeoutRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearMenuTimeout();
    setMenuOpen(true);
  }, [clearMenuTimeout]);

  const closeMenuWithDelay = useCallback(() => {
    clearMenuTimeout();
    menuTimeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
    }, 350);
  }, [clearMenuTimeout]);

  const toggleMenu = useCallback(() => {
    clearMenuTimeout();
    setActiveCategory(categories[0] || categoryData[0]);
    setMenuOpen((prev) => !prev);
  }, [clearMenuTimeout]);

  const closeAdminMenuWithDelay = useCallback(() => {
    clearAdminTimeout();
    adminTimeoutRef.current = setTimeout(() => {
      setAdminMenuOpen(false);
    }, 350);
  }, [clearAdminTimeout]);

  const openAdminMenu = useCallback(() => {
    clearAdminTimeout();
    setAdminMenuOpen(true);
  }, [clearAdminTimeout]);

  const toggleAdminMenu = useCallback(() => {
    clearAdminTimeout();
    setAdminMenuOpen((prev) => !prev);
  }, [clearAdminTimeout]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const term = search.trim();
    if (!term) return;

    navigate(`/catalogo?search=${encodeURIComponent(term)}`);
    setMenuOpen(false);
  }, [search, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    setAdminMenuOpen(false);
    setMenuOpen(false);
  }, [logout]);

  const handleCategoryMouseEnter = useCallback(() => {
    setActiveCategory(categories[0] || categoryData[0]);
    openMenu();
  }, [openMenu, categories]);

  const handleCategoryMouseEnterItem = useCallback((category: CategoryItem) => {
    setActiveCategory(category);
  }, []);

  const handleCategoryClick = useCallback((category: CategoryItem) => {
    setActiveCategory(category);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (categoriesRef.current && !categoriesRef.current.contains(target)) {
        setMenuOpen(false);
      }

      if (adminMenuRef.current && !adminMenuRef.current.contains(target)) {
        setAdminMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearMenuTimeout();
      clearAdminTimeout();
    };
  }, []);

  return (
    <>
      <div className="site-navbar">
      <div className={`top-navbar ${isAuthPage ? "auth-navbar" : ""}`}>
        <Link to={homeRoute} className="logo">
          <img src="/logo.png" alt="CyberWeb Logo" className="logo-img" />
        </Link>

        {!isAuthPage && (
          <form className={`search-bar ${mobileSearchOpen ? 'active' : ''}`} onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        )}

        {isAuthPage && <div className="auth-spacer" />}

        <div className="nav-actions">
          {/* Botones móviles */}
          <button 
            className="mobile-search-toggle" 
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            aria-label="Buscar"
          >
            <FaSearch />
          </button>
          
          <button 
            className="mobile-menu-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú"
          >
            <FaBars />
          </button>
          <div className="social-icons">
            <a
              href="https://www.facebook.com/CyberPuntarenas"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              title="Facebook"
            >
              <FaFacebookF />
            </a>

            <a
              href="https://wa.me/50661621010"
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              title="WhatsApp"
            >
              <FaWhatsapp />
            </a>

            <a
              href="https://www.instagram.com/cyberpuntarenas/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              title="Instagram"
            >
              <FaInstagram />
            </a>

            <a
              href="https://www.tiktok.com/@suministroscyber"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              title="TikTok"
            >
              <FaTiktok />
            </a>
          </div>

          {user ? (
            <div className="user-actions">
              <Link to="/mi-cuenta" className="account-link">
                Hola {displayName}
              </Link>

              {isAdmin && !isAuthPage && (
                <div
                  ref={adminMenuRef}
                  className="admin-menu-wrapper"
                  onMouseEnter={openAdminMenu}
                  onMouseLeave={closeAdminMenuWithDelay}
                >
                  <button
                    type="button"
                    className="admin-menu-button"
                    onClick={toggleAdminMenu}
                  >
                    <FaUserShield />
                    <span>Administración</span>
                  </button>

                  {adminMenuOpen && (
                    <div
                      className="admin-dropdown-menu"
                      onMouseEnter={openAdminMenu}
                      onMouseLeave={closeAdminMenuWithDelay}
                    >
                      <Link
                        to="/admin/add-product"
                        className="admin-dropdown-link"
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        Agregar producto
                      </Link>

                      <Link
                        to="/admin/categories"
                        className="admin-dropdown-link"
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        Gestión de categorías
                      </Link>

                      <Link
                        to="/admin/orders"
                        className="admin-dropdown-link"
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        Lista de pedidos
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <span
                className="logout"
                onClick={handleLogout}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleLogout();
                  }
                }}
              >
                Salir
              </span>
            </div>
          ) : (
            <Link to="/login" className="login-link">
              Acceso / Registro
            </Link>
          )}

          <Link to="/cart" className="cart-icon">
            <img src="/cart.png" alt="Carrito" style={{ width: '30px', height: '30px' }} />
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
        </div>
      </div>

      <div className="category-navbar-modern">
        <div
          ref={categoriesRef}
          className="categories-dropdown"
          onMouseEnter={handleCategoryMouseEnter}
          onMouseLeave={closeMenuWithDelay}
        >
          <button
            className="category-trigger"
            type="button"
            onClick={toggleMenu}
          >
            <FaBars />
            <span>Ver categorías</span>
          </button>

          {menuOpen && (
            <div
              className="categories-panel"
              onMouseEnter={openMenu}
              onMouseLeave={closeMenuWithDelay}
            >
              <div className="categories-sidebar">
                {(categories.length > 0 ? categories : categoryData).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`category-side-item ${
                      activeCategory?.id === category.id ? "active" : ""
                    }`}
                    onMouseEnter={() => handleCategoryMouseEnterItem(category)}
                    onClick={() => handleCategoryClick(category)}
                  >
                    <span className="category-side-icon">{category.icon}</span>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
              <div className="categories-content">
                {activeCategory && (
                  <>
                    {activeCategory.sections.map((section) => (
                      <div key={section.title} className="category-section-block">
                        <Link
                          to={section.to}
                          className="section-title-link"
                          onClick={() => setMenuOpen(false)}
                        >
                          {section.title}
                        </Link>
                        <div className="category-section-links">
                          {section.links.map((link) => (
                            <Link
                              key={link.key || link.to}
                              to={link.to}
                              onClick={() => setMenuOpen(false)}
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="category-links-top">
          <Link to="/tiendas">Nuestra tienda</Link>
          <Link to="/garantias">Garantías y devoluciones</Link>
          <Link to="/nosotros">Sobre nosotros</Link>
          <Link to="/descuentos">Descuentos</Link>
        </div>
      </div>
      </div>

      {/* Versión móvil - popup */}
      <div className={`category-navbar-modern-mobile ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="categories-dropdown-mobile">
          <button
            className="category-trigger"
            type="button"
            onClick={() => setMobileMenuOpen(false)}
          >
            <FaBars />
            <span>Menú</span>
          </button>

          {/* Navegación por pestañas */}
          <div className="mobile-tab-navigation">
            <button
              className={`mobile-tab-button ${mobileActiveTab === "categories" ? "active" : ""}`}
              onClick={() => setMobileActiveTab("categories")}
            >
              <FaBars />
              <span>Categorías</span>
            </button>
            <button
              className={`mobile-tab-button ${mobileActiveTab === "links" ? "active" : ""}`}
              onClick={() => setMobileActiveTab("links")}
            >
              <FaBars />
              <span>Redes y Ubicación</span>
            </button>
          </div>

          {/* Contenido de las pestañas */}
          <div className="mobile-tab-content">
            {mobileActiveTab === "categories" && (
              <div className="mobile-categories-content">
                <div className="categories-sidebar">
                  {(categories.length > 0 ? categories : categoryData).map((category) => (
                    <div key={category.id}>
                      <button
                        type="button"
                        className={`category-side-item ${
                          selectedCategory?.id === category.id ? "active" : ""
                        }`}
                        onClick={() => setSelectedCategory(
                          selectedCategory?.id === category.id ? null : category
                        )}
                      >
                        <span className="category-side-icon">{category.icon}</span>
                        <span>{category.name}</span>
                        <span className="category-arrow">
                          {selectedCategory?.id === category.id ? "×" : ">"}
                        </span>
                      </button>
                      
                      {/* Subcategorías debajo de la categoría seleccionada */}
                      {selectedCategory?.id === category.id && (
                        <div className="subcategory-list">
                          {category.sections.map((section) => (
                            <div key={`${category.id}-${section.title}`}>
                              <Link
                                to={section.to}
                                onClick={() => setMenuOpen(false)}
                              >
                                {section.title}
                              </Link>
                              <div className="subcategory-links">
                                {section.links.map((link) => (
                                  <Link
                                    key={link.key || link.to}
                                    to={link.to}
                                    onClick={() => setMenuOpen(false)}
                                  >
                                    {link.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mobileActiveTab === "links" && (
              <div className="mobile-links-content">
                {/* Enlaces de navegación */}
                <div className="mobile-nav-links">
                  <Link to="/tiendas" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                    Nuestra tienda
                  </Link>
                  <Link to="/garantias" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                    Garantías y devoluciones
                  </Link>
                  <Link to="/nosotros" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                    Sobre nosotros
                  </Link>
                  <Link to="/descuentos" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                    Descuentos
                  </Link>
                </div>

                {/* Redes sociales */}
                <div className="mobile-social-section">
                  <h4 className="mobile-social-title">Síguenos en redes sociales</h4>
                  <div className="mobile-social-icons">
                    <a
                      href="https://www.facebook.com/CyberPuntarenas"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Facebook"
                      title="Facebook"
                      className="mobile-social-link"
                    >
                      <FaFacebookF />
                      <span>Facebook</span>
                    </a>

                    <a
                      href="https://wa.me/50661621010"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="WhatsApp"
                      title="WhatsApp"
                      className="mobile-social-link"
                    >
                      <FaWhatsapp />
                      <span>WhatsApp</span>
                    </a>

                    <a
                      href="https://www.instagram.com/cyberpuntarenas/"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Instagram"
                      title="Instagram"
                      className="mobile-social-link"
                    >
                      <FaInstagram />
                      <span>Instagram</span>
                    </a>

                    <a
                      href="https://www.tiktok.com/@suministroscyber"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="TikTok"
                      title="TikTok"
                      className="mobile-social-link"
                    >
                      <FaTiktok />
                      <span>TikTok</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(Navbar);