import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersAPI } from '../services/api';

const RiderDashboardScreen: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await ordersAPI.getRiderDashboard();
      setDashboardData(res.data);
    } catch (error) {
      console.error('Failed to load rider dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleUpdateDeliveryStatus = async (deliveryId: number, newStatus: string) => {
    try {
      await ordersAPI.updateRiderOrderStatus(deliveryId.toString(), { status: newStatus });
      Alert.alert('Success', `Delivery status updated to ${newStatus}`);
      loadDashboard();
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      Alert.alert('Error', 'Failed to update delivery status');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No dashboard data available.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rider Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back!</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="bicycle-outline" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>{dashboardData.active_deliveries || 0}</Text>
          <Text style={styles.statLabel}>Active Deliveries</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#2196F3" />
          <Text style={styles.statValue}>{dashboardData.completed_deliveries || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Deliveries</Text>
        {dashboardData.current_deliveries && dashboardData.current_deliveries.length > 0 ? (
          dashboardData.current_deliveries.map((delivery: any, index: number) => (
            <View key={index} style={styles.deliveryCard}>
              <View style={styles.deliveryHeader}>
                <Text style={styles.deliveryId}>Order #{delivery.order_id}</Text>
                <Text style={styles.deliveryStatus}>{delivery.status}</Text>
              </View>
              <View style={styles.deliveryDetails}>
                <Text style={styles.detailText}>
                  <Ionicons name="location-outline" size={14} /> {delivery.address}
                </Text>
                <Text style={styles.detailText}>
                  <Ionicons name="person-outline" size={14} /> {delivery.customer_name}
                </Text>
              </View>
              {delivery.status === 'shipped' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUpdateDeliveryStatus(delivery.id, 'delivered')}
                >
                  <Text style={styles.actionButtonText}>Mark as Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No active deliveries.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    marginTop: -20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  deliveryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deliveryStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    textTransform: 'uppercase',
  },
  deliveryDetails: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});

export default RiderDashboardScreen;
