const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ruvia Cosmetics API',
      version: '1.0.0',
      description: 'API documentation for Ruvia Cosmetics e-commerce platform',
      contact: {
        name: 'Ruvia Support',
        email: 'info@ruviacosmetics.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.ruvia.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'HTTP-only cookie containing JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'User ID' },
            name: { type: 'string', description: 'User name' },
            email: { type: 'string', format: 'email', description: 'User email' },
            role: { type: 'string', enum: ['user', 'admin'], description: 'User role' },
            emailVerified: { type: 'boolean', description: 'Email verification status' },
            isBlocked: { type: 'boolean', description: 'Account block status' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Product ID' },
            name: { type: 'string', description: 'Product name' },
            description: { type: 'string', description: 'Product description' },
            price: { type: 'number', description: 'Product price' },
            image: { type: 'string', description: 'Product image URL' },
            category: { type: 'string', description: 'Product category' },
            stock: { type: 'number', description: 'Available stock' },
            rating: { type: 'number', description: 'Average rating' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Order ID' },
            user: { type: 'string', description: 'User ID' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  qty: { type: 'number' },
                },
              },
            },
            total: { type: 'number', description: 'Order total' },
            status: { type: 'string', enum: ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'] },
            isPaid: { type: 'boolean', description: 'Payment status' },
            paymentMethod: { type: 'string', enum: ['Razorpay', 'COD'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', description: 'Error code' },
                message: { type: 'string', description: 'Error message' },
                details: { type: 'string', description: 'Error details' },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
  },
  apis: [
    './routes/authRoutes.js',
    './routes/productRoutes.js',
    './routes/orderRoutes.js',
    './routes/paymentRoutes.js',
    './routes/cartRoutes.js',
    './routes/reviewRoutes.js',
    './routes/returnRoutes.js',
    './routes/wishlistRoutes.js',
    './routes/adminRoutes.js',
    './routes/promotionRoutes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
