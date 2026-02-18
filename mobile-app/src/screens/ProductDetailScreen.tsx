import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { productsAPI, cartAPI, API_BASE_URL } from '../services/api';
import { Product, RootStackParamList } from '../types';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailNavigationProp = StackNavigationProp<RootStackParamList>;

const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<ProductDetailNavigationProp>();
  const { user } = useAuth();
  const { product } = route.params;

  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const resolveImage = (image_url?: string, image?: string) => {
    if (image_url) return image_url.startsWith('http') ? image_url : `${API_BASE_URL}${image_url}`;
    if (image) return `${API_BASE_URL}/static/uploads/products/${image}`;
    return 'https://via.placeholder.com/400';
  };

  useEffect(() => {
    loadRelatedProducts();
  }, [product]);

  const loadRelatedProducts = async () => {
    try {
      setIsLoadingRelated(true);
      const response = await productsAPI.getAll();
      const allProducts: Product[] = response.data || [];
      const related = allProducts.filter(
        (p) => p.farmer_id === product.farmer_id && p.id !== product.id
      );
      setRelatedProducts(related.slice(0, 6));
    } catch (error) {
      console.error('Error loading related products:', error);
    } finally {
      setIsLoadingRelated(false);
    }
  };

  const incrementQuantity = () => {
    if (quantity < (product.quantity || 999)) {
      setQuantity((q) => q + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const addToCart = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add items to your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    try {
      setIsAddingToCart(true);
      await cartAPI.addToCart(product.id, quantity);
      Alert.alert('Added to Cart', `${quantity} x ${product.name} added to your cart!`, [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('MainTabs', { screen: 'Cart' } as any) },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const navigateToRelatedProduct = (relProduct: Product) => {
    navigation.push('ProductDetail', { product: relProduct });
  };

  const navigateToFarmer = () => {
    if (product.farmer_id) {
      navigation.navigate('FarmerProfile', { farmerId: product.farmer_id });
    }
  };

  const inStock = product.available !== false && product.quantity > 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Product Image */}
      <Image
        source={{ uri: resolveImage(product.image_url, product.image) }}
        style={styles.productImage}
        resizeMode="cover"
      />

      {/* Category Badge */}
      {product.category && (
        <View style={styles.categoryBadgeContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{product.category}</Text>
          </View>
        </View>
      )}

      {/* Product Info */}
      <View style={styles.infoSection}>
        <Text style={styles.productName}>{product.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₱{product.price?.toFixed(2)}</Text>
          <Text style={styles.unit}>per {product.unit || 'unit'}</Text>
        </View>

        {/* Stock Status */}
        <View style={styles.stockRow}>
          <View
            style={[
              styles.stockBadge,
              { backgroundColor: inStock ? '#E8F5E9' : '#FFEBEE' },
            ]}
          >
            <Ionicons
              name={inStock ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={inStock ? '#2E7D32' : '#C62828'}
            />
            <Text
              style={[
                styles.stockText,
                { color: inStock ? '#2E7D32' : '#C62828' },
              ]}
            >
              {inStock ? `In Stock (${product.quantity} available)` : 'Out of Stock'}
            </Text>
          </View>
        </View>

        {/* Farmer Info */}
        <TouchableOpacity style={styles.farmerCard} onPress={navigateToFarmer}>
          <View style={styles.farmerAvatar}>
            <Ionicons name="person" size={20} color="#4CAF50" />
          </View>
          <View style={styles.farmerInfo}>
            <Text style={styles.farmerName}>{product.farmer_name}</Text>
            {product.location && (
              <Text style={styles.farmerLocation}>
                <Ionicons name="location" size={12} color="#666" /> {product.location}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* Description */}
        {product.description ? (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        ) : null}

        {/* Quantity Selector */}
        {inStock && (
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityBtn, quantity <= 1 && styles.quantityBtnDisabled]}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? '#ccc' : '#333'} />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.quantityBtn,
                  quantity >= product.quantity && styles.quantityBtnDisabled,
                ]}
                onPress={incrementQuantity}
                disabled={quantity >= product.quantity}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={quantity >= product.quantity ? '#ccc' : '#333'}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtotal}>
              Subtotal: ₱{(product.price * quantity).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[styles.addToCartBtn, (!inStock || isAddingToCart) && styles.addToCartBtnDisabled]}
          onPress={addToCart}
          disabled={!inStock || isAddingToCart}
        >
          {isAddingToCart ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="cart" size={22} color="#fff" />
              <Text style={styles.addToCartText}>
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.sectionTitle}>More from {product.farmer_name}</Text>
          <FlatList
            data={relatedProducts}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.relatedCard}
                onPress={() => navigateToRelatedProduct(item)}
              >
                <Image
                  source={{ uri: resolveImage(item.image_url, item.image) }}
                  style={styles.relatedImage}
                  resizeMode="cover"
                />
                <View style={styles.relatedInfo}>
                  <Text style={styles.relatedName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.relatedPrice}>₱{item.price?.toFixed(2)}</Text>
                  <Text style={styles.relatedStock}>
                    {item.quantity > 0 ? `${item.quantity} in stock` : 'Out of Stock'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
  },
  categoryBadgeContainer: {
    position: 'absolute',
    top: 15,
    left: 15,
  },
  categoryBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  unit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  stockRow: {
    marginBottom: 15,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  farmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
  },
  farmerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  farmerInfo: {
    flex: 1,
  },
  farmerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  farmerLocation: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  descriptionSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  quantitySection: {
    marginBottom: 15,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    overflow: 'hidden',
  },
  quantityBtn: {
    padding: 12,
    backgroundColor: '#e0e0e0',
  },
  quantityBtnDisabled: {
    backgroundColor: '#f0f0f0',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
  },
  subtotal: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 10,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 5,
  },
  addToCartBtnDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  relatedSection: {
    padding: 20,
    paddingTop: 10,
  },
  relatedCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 150,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  relatedImage: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  relatedInfo: {
    padding: 10,
  },
  relatedName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  relatedPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  relatedStock: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});

export default ProductDetailScreen;