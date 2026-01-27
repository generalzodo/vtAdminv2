/**
 * Tenant Configuration for Admin Panel
 * 
 * Centralized configuration for white-label tenant branding and settings.
 * All values are loaded from environment variables to support multi-tenant deployments.
 */

export interface TenantConfig {
  // Company Branding
  companyName: string;
  tagline: string;
  logoUrl: string;
  logoAltUrl: string;
  
  // Theme
  primaryColor: string;
  primaryColorHex: string;
  
  // Contact Information
  supportEmail: string;
  
  // API Configuration
  apiBaseUrl: string;
  
  // Feature Flags
  features: {
    wallet: boolean;
    agentProgram: boolean;
    reviews: boolean;
  };
}

/**
 * Load tenant configuration from environment variables
 */
export const tenantConfig: TenantConfig = {
  // Company Branding
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Victoria Travels',
  tagline: process.env.NEXT_PUBLIC_TAGLINE || 'The Safe and Comfortable way to travel',
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png',
  logoAltUrl: process.env.NEXT_PUBLIC_LOGO_ALT_URL || '/logo-alt.png',
  
  // Theme
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '120 100% 20%',
  primaryColorHex: process.env.NEXT_PUBLIC_PRIMARY_COLOR_HEX || '#006400',
  
  // Contact Information
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@victoriatravels.com.ng',
  
  // API Configuration
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/',
  
  // Feature Flags
  features: {
    wallet: process.env.NEXT_PUBLIC_FEATURE_WALLET !== 'false',
    agentProgram: process.env.NEXT_PUBLIC_FEATURE_AGENT_PROGRAM !== 'false',
    reviews: process.env.NEXT_PUBLIC_FEATURE_REVIEWS !== 'false',
  },
};

/**
 * Helper to get admin panel page title
 */
export function getAdminPageTitle(pageTitle?: string): string {
  if (pageTitle) {
    return `${pageTitle} | ${tenantConfig.companyName} Admin`;
  }
  return `${tenantConfig.companyName} Admin Panel`;
}

export default tenantConfig;
