# ☁️ AWS Deployment Guide: FunaGig v2.5

This guide provides step-by-step instructions for deploying the FunaGig marketplace to Amazon Web Services (AWS) using **RDS (PostgreSQL)**, **Elastic Beanstalk (Node.js)**, and **S3 (Static Website Hosting)**.

---

## 🏗️ Deployment Architecture

- **Frontend:** React SPA hosted on **Amazon S3** (optionally distributed via CloudFront).
- **Backend:** Express API running on **AWS Elastic Beanstalk** (Load Balanced Node.js environment).
- **Database:** Relational data persisted in **Amazon RDS for PostgreSQL**.

---

## 1. 🗄️ Database Setup (Amazon RDS)

### Create the RDS Instance
1. Go to the **RDS Console** and click **Create database**.
2. Select **Standard create** and **PostgreSQL**.
3. Choose the **Free Tier** template (if applicable).
4. **Settings:** Set `DB instance identifier` to `funagig-db`. Set your master username and password.
5. **Connectivity:**
   - Ensure **Public access** is set to **No** (unless you need to access it from your local machine for initial setup; if so, restrict it to your IP).
   - Create a new **VPC security group** named `funagig-rds-sg`.
6. Click **Create database**.

### Initialize the Schema
1. Once the DB is available, note the **Endpoint**.
2. From a machine with access to the RDS instance, run:
   ```bash
   psql -h <rds-endpoint> -U <username> -d postgres -f database.sql
   ```

---

## 2. 🚂 Backend Deployment (AWS Elastic Beanstalk)

### Prepare the Application
1. Navigate to the `server/` directory.
2. Ensure `package.json` has `scripts.start` set to `node src/index.js`.
3. Create a ZIP file of the `server/` directory content (excluding `node_modules`).

### Create Elastic Beanstalk Environment
1. Go to the **Elastic Beanstalk Console** and click **Create application**.
2. **Application name:** `funagig-api`.
3. **Platform:** Node.js (Latest version).
4. **Application code:** Upload your ZIP file.
5. **Configuration:**
   - Go to **Software Configuration**.
   - Add the following **Environment properties**:
     - `DATABASE_URL`: `postgresql://<user>:<password>@<rds-endpoint>:5432/postgres`
     - `JWT_SECRET`: Your long random string.
     - `CLIENT_ORIGIN`: Your S3 bucket URL or CloudFront URL.
     - `PORT`: `8081` (EB default for Node.js is often 8081 or 8080).
6. Click **Create app**.

### Security Group Update
Ensure the RDS security group (`funagig-rds-sg`) allows inbound traffic on port `5432` from the Elastic Beanstalk security group.

---

## 3. 🖥️ Frontend Deployment (Amazon S3)

### Build the React App
1. Navigate to the `client/` directory.
2. Create or update `.env.production`:
   ```env
   VITE_API_URL=http://<your-eb-environment-url>
   ```
3. Run the build command:
   ```bash
   npm run build
   ```
   This generates a `dist/` folder.

### Upload to S3
1. Go to the **S3 Console** and click **Create bucket**.
2. **Bucket name:** `funagig-frontend` (must be globally unique).
3. **Public access:** Uncheck **Block all public access** (since this is a public website).
4. In the bucket **Properties**, enable **Static website hosting**.
   - Index document: `index.html`
   - Error document: `index.html` (important for SPA routing).
5. In the bucket **Permissions**, add a **Bucket Policy** to allow public reads:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::funagig-frontend/*"
       }
     ]
   }
   ```
6. **Upload Content:** Upload the contents of the `client/dist/` folder to the root of the bucket.

---

## 🔗 Final Integration

1. Copy the **S3 Bucket Website Endpoint** (from S3 Properties).
2. Go back to **Elastic Beanstalk Configuration > Software** and update `CLIENT_ORIGIN` with this URL.
3. Your application should now be live!

---

## 🔒 Security Best Practices (Recommended)
- **CloudFront:** Use Amazon CloudFront in front of S3 to enable HTTPS and better performance.
- **ACM:** Use AWS Certificate Manager for free SSL certificates.
- **VPC:** Ensure RDS and Elastic Beanstalk are in the same VPC for private networking.
