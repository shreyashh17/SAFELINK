import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import authRoutes from './routes/auth';
import sosRoutes from './routes/sos';
import complaintRoutes from './routes/complaint';
import locationRoutes from './routes/location';
import geofenceRoutes from './routes/geofence';
import eventRoutes from './routes/event';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import broadcastRoutes from './routes/broadcast';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({ origin: '*' }));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/complaint', complaintRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/geofence', geofenceRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/broadcast', broadcastRoutes);

app.get('/health', (_req, res) => res.json({ status: 'SafeLink API running ✅' }));

app.use(errorHandler);

export default app;
