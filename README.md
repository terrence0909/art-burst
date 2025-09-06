# ArtBurst - Local Art Auction Platform

ArtBurst is a modern web application that connects local artists with art enthusiasts through an engaging auction platform. Built with React, TypeScript, and AWS serverless infrastructure.

## 🚀 Live Demo

**Production URL**: coming soon... 
**API Endpoint**: https://v3w12ytklh.execute-api.us-east-1.amazonaws.com/prod

## ✨ Features

- 🎨 **Artwork Listings**: Create beautiful listings with multiple images
- ⚡ **Real-time Bidding**: Live auction experience with bid updates
- 📱 **Responsive Design**: Mobile-first design that works on all devices
- 🔐 **Secure Authentication**: AWS Cognito user management
- 🖼️ **Image Optimization**: Automatic image compression and CDN delivery
- 🌍 **Local Focus**: Connect with artists in your community

## 🛠️ Technology Stack

### Frontend
- **Vite** - Next-generation frontend tooling
- **React 18** with TypeScript
- **shadcn/ui** - Beautifully designed components
- **Tailwind CSS** - Utility-first CSS framework
- **AWS Amplify** - Frontend cloud services

### Backend
- **AWS API Gateway** - RESTful API management
- **AWS Lambda** - Serverless functions (Node.js 18.x)
- **Amazon DynamoDB** - NoSQL database
- **Amazon S3** - File storage with presigned URLs
- **Terraform** - Infrastructure as Code

## 🏗️ Project Structure

```
Art-Burst/
├── src/                    # React frontend source
│   ├── api/               # API client and utilities
│   ├── components/        # Reusable React components
│   ├── pages/            # Page components
│   └── types/            # TypeScript definitions
├── lambdas/              # AWS Lambda functions
├── terraform/            # Infrastructure configuration
└── docs/                 # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- AWS Account with appropriate permissions
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/terrence0909/Art-Burst.git
   cd Art-Burst
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your AWS and API configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:8080`

### AWS Deployment

1. **Set up AWS credentials**
   ```bash
   aws configure
   ```

2. **Deploy infrastructure**
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```

3. **Deploy frontend**
   ```bash
   npm run build
   aws s3 sync dist/ s3://art-burst
   ```

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Environment Variables
```env
VITE_API_BASE_URL=https://v3w12ytklh.execute-api.us-east-1.amazonaws.com/prod
VITE_AWS_REGION=us-east-1
VITE_S3_BUCKET=art-burst
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXX
```

## 🎯 Key Implementation Details

- **Presigned URLs**: Secure temporary access to private S3 objects
- **CORS Configuration**: Properly configured for API Gateway and S3
- **Error Handling**: Comprehensive error handling throughout the stack
- **Type Safety**: Full TypeScript implementation front to back
- **Responsive Design**: Mobile-first responsive UI components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🆘 Support

For support and questions:
- 📧 Email: support@artburst.com
- 🐛 [Issue Tracker](https://github.com/terrence0909/Art-Burst/issues)

## 🙏 Acknowledgments

- UI components by [shadcn/ui](https://ui.shadcn.com)
- Icons by [Lucide](https://lucide.dev)
- Deployment by [AWS](https://aws.amazon.com)

---

**ArtBurst** - Bringing local art communities together through technology 🎨