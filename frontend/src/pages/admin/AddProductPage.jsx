import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Plus, Trash2,
  Gem, Calculator, Image as ImageIcon,
  Package, Truck,
  FileText, Tag, Zap,
  RefreshCw,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ============================================================
// TOP-LEVEL COMPONENTS
// ============================================================

const NumberInput = ({ onWheel, ...props }) => (
  <input
    type="number"
    onWheel={(e) => e.target.blur()}
    {...props}
  />
);

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden mb-4 sm:mb-6">
    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 border-b border-gray-100 dark:border-dark-border">
      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 flex-shrink-0" />
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white truncate">{title}</h3>
    </div>
    <div className="p-3 sm:p-4 md:p-5">{children}</div>
  </div>
);

const Field = ({ label, required, hint, children, action }) => (
  <div className="min-w-0">
    <div className="flex items-center justify-between gap-2 mb-1.5">
      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {action}
    </div>
    {children}
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

// ============================================================
// PAGE COMPONENT
// ============================================================

const AddProductPage = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);
  const { token } = useAuth();

  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState({ color: null, type: null });

  const [masterData, setMasterData] = useState({
    jewelleryTypes: [],
    collections: [],
    occasions: [],
    productStyles: [],
    karigars: [],
    metals: [],
    metalColors: [],
    productSizes: [],
    gemstones: [],
  });

  const [diamonds, setDiamonds] = useState([]);
  const [metalOptions, setMetalOptions] = useState([]);
  const [gemstoneOptions, setGemstoneOptions] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    jewelleryType: '',
    productSizing: 'Free size',
    productStyle: '',
    collectionId: '',
    occasion: '',
    description: '',
    sku: '',
    gst: 3,
    returnPolicy: 'Apply global Return Policy',
    note: 'Apply global Note',
    continueSelling: false,
    shippingLength: '',
    shippingWidth: '',
    shippingHeight: '',
    variants: [createEmptyVariant()],
    screwOptions: [{ screwType: '', screwMaterial: '', notes: '' }],
    colorMedia: [],
    metaTitle: '',
    metaDescription: '',
    metaKeywords: [''],
    isBestSeller: false,
    isFastDelivery: false,
    tags: [''],
  });

  function createEmptyVariant() {
    return {
      metal: '',
      metalKarat: null,
      metalWeight: '',
      metalColor: '',
      productSize: '',
      gemstone: '',
      gemstoneRateId: '',
      gemstoneWeight: '',
      diamondId: '',
      numberOfDiamonds: '',
      numberOfSideDiamonds: '',
      sideDiamondPrice: '',
      sideDiamondWeight: '',
      sideDiamondQuality: '',
      karigar: '',
      makingChargeWeightRange: '',
      makingChargeOverride: '',
      beadsWeight: '',
      stoneSubtractWeight: '',
      stoneValue: '',
      customOrderPremiumType: 'None',
      customOrderPremiumValue: '',
      stock: 0,
      sku: '',
    };
  }

  const fetchMasterData = useCallback(async () => {
    try {
      const [
        jewelleryTypesRes,
        collectionsRes,
        occasionsRes,
        productStylesRes,
        karigarsRes,
        metalsRes,
        metalColorsRes,
        productSizesRes,
        gemstonesRes,
        diamondsRes,
        metalOptionsRes,
        gemstoneOptionsRes,
      ] = await Promise.all([
        axios.get('http://localhost:5000/api/master-data/jewellery-types'),
        axios.get('http://localhost:5000/api/master-data/collections'),
        axios.get('http://localhost:5000/api/master-data/occasions'),
        axios.get('http://localhost:5000/api/master-data/product-styles'),
        axios.get('http://localhost:5000/api/master-data/karigars'),
        axios.get('http://localhost:5000/api/master-data/metals'),
        axios.get('http://localhost:5000/api/master-data/metal-colors'),
        axios.get('http://localhost:5000/api/master-data/product-sizes'),
        axios.get('http://localhost:5000/api/master-data/gemstones'),
        axios.get('http://localhost:5000/api/admin/diamonds', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/admin/metal-options', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:5000/api/admin/gemstone-options', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setMasterData({
        jewelleryTypes: jewelleryTypesRes.data,
        collections: collectionsRes.data,
        occasions: occasionsRes.data,
        productStyles: productStylesRes.data,
        karigars: karigarsRes.data,
        metals: metalsRes.data,
        metalColors: metalColorsRes.data,
        productSizes: productSizesRes.data,
        gemstones: gemstonesRes.data,
      });

      setDiamonds(Array.isArray(diamondsRes.data) ? diamondsRes.data : []);
      setMetalOptions(Array.isArray(metalOptionsRes.data) ? metalOptionsRes.data : []);
      setGemstoneOptions(Array.isArray(gemstoneOptionsRes.data) ? gemstoneOptionsRes.data : []);
    } catch (error) {
      console.error('Error fetching master data:', error);
      toast.error('Could not load master data — is the backend running?');
    }
  }, [token]);

  const fetchProductForEdit = useCallback(async () => {
    if (!editId) return;
    setLoadingProduct(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/products/${editId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const p = res.data;

      setFormData({
        name: p.name || '',
        jewelleryType: p.category || '',
        productSizing: p.productSizing || 'Free size',
        productStyle: p.productStyle || '',
        collectionId: p.collectionId || '',
        occasion: p.occasion || '',
        description: p.description || '',
        sku: p.sku || '',
        gst: p.gst ?? 3,
        returnPolicy: p.returnPolicy || 'Apply global Return Policy',
        note: p.note || 'Apply global Note',
        continueSelling: p.continueSelling ?? false,
        shippingLength: p.shippingLength ?? '',
        shippingWidth: p.shippingWidth ?? '',
        shippingHeight: p.shippingHeight ?? '',

        variants:
          Array.isArray(p.variants) && p.variants.length > 0
            ? p.variants.map((v) => ({
                metal: v.metal || '',
                metalKarat: v.metalKarat ?? null,
                metalWeight: v.metalWeight ?? '',
                metalColor: v.metalColor || '',
                productSize: v.productSize || '',
                gemstone: v.gemstone || '',
                gemstoneRateId: v.gemstoneRateId || '',
                gemstoneWeight: v.gemstoneWeight ?? '',
                diamondId: v.diamondId || '',
                numberOfDiamonds: v.numberOfDiamonds ?? '',
                numberOfSideDiamonds: v.numberOfSideDiamonds ?? '',
                sideDiamondPrice: v.sideDiamondPrice ?? '',
                sideDiamondWeight: v.sideDiamondWeight ?? '',
                sideDiamondQuality: v.sideDiamondQuality || '',
                karigar: v.karigar || '',
                makingChargeWeightRange: v.makingChargeWeightRange || '',
                makingChargeOverride: v.makingChargeOverride ?? '',
                beadsWeight: v.beadsWeight ?? '',
                stoneSubtractWeight: v.stoneSubtractWeight ?? '',
                stoneValue: v.stoneValue ?? '',
                customOrderPremiumType: v.customOrderPremiumType || 'None',
                customOrderPremiumValue: v.customOrderPremiumValue ?? '',
                stock: v.stock ?? 0,
                sku: v.sku || '',
              }))
            : [createEmptyVariant()],

        screwOptions:
          Array.isArray(p.screwOptions) && p.screwOptions.length > 0
            ? p.screwOptions.map((s) => ({
                screwType: s.screwType || '',
                screwMaterial: s.screwMaterial || '',
                notes: s.notes || '',
              }))
            : [{ screwType: '', screwMaterial: '', notes: '' }],

        colorMedia: Array.isArray(p.colorMedia)
          ? p.colorMedia.map((m) => ({
              color: m.color,
              url: m.url,
              type: m.type || 'image',
            }))
          : [],

        metaTitle: p.metaTitle || '',
        metaDescription: p.metaDescription || '',
        metaKeywords: Array.isArray(p.metaKeywords) && p.metaKeywords.length > 0 ? p.metaKeywords : [''],
        isBestSeller: p.isBestSeller ?? false,
        isFastDelivery: p.isFastDelivery ?? false,
        tags: Array.isArray(p.tags) && p.tags.length > 0 ? p.tags : [''],
      });
    } catch (err) {
      console.error('Failed to load product for edit:', err);
      toast.error('Could not load product for editing');
      navigate('/admin/products');
    } finally {
      setLoadingProduct(false);
    }
  }, [editId, token, navigate]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  useEffect(() => {
    if (isEditMode) {
      fetchProductForEdit();
    }
  }, [isEditMode, fetchProductForEdit]);

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, createEmptyVariant()]
    }));
  };

  const removeVariant = (index) => {
    if (formData.variants.length === 1) {
      toast.error('At least one variant is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const updateVariant = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const addScrewOption = () => {
    setFormData(prev => ({
      ...prev,
      screwOptions: [...prev.screwOptions, { screwType: '', screwMaterial: '', notes: '' }]
    }));
  };

  const removeScrewOption = (index) => {
    setFormData(prev => ({
      ...prev,
      screwOptions: prev.screwOptions.filter((_, i) => i !== index)
    }));
  };

  const updateScrewOption = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      screwOptions: prev.screwOptions.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
    }));
  };

  const addKeyword = () => {
    setFormData(prev => ({ ...prev, metaKeywords: [...prev.metaKeywords, ''] }));
  };

  const updateKeyword = (index, value) => {
    setFormData(prev => ({
      ...prev,
      metaKeywords: prev.metaKeywords.map((k, i) => i === index ? value : k)
    }));
  };

  const removeKeyword = (index) => {
    setFormData(prev => ({
      ...prev,
      metaKeywords: prev.metaKeywords.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    setFormData(prev => ({ ...prev, tags: [...prev.tags, ''] }));
  };

  const updateTag = (index, value) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.map((t, i) => i === index ? value : t)
    }));
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const COLOR_ORDER = ['Rose', 'Yellow', 'White'];

  const usedColors = Array.from(
    new Set(
      formData.variants
        .map((v) => v.metalColor)
        .filter(Boolean)
    )
  ).sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b));

  const handleMediaUpload = async (color, type, fileList) => {
    if (!fileList || fileList.length === 0) return;

    setUploadingMedia({ color, type });

    try {
      const files = Array.from(fileList);
      const uploaded = [];

      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);

        const res = await axios.post(
          'http://localhost:5000/api/upload',
          fd,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let url = res.data?.url || res.data?.secure_url || res.data?.fileUrl;

        if (url && url.startsWith('/')) {
          url = `http://localhost:5000${url}`;
        }

        if (!url) {
          throw new Error('Upload succeeded but no URL returned');
        }

        uploaded.push({ color, url, type });
      }

      setFormData((prev) => ({
        ...prev,
        colorMedia: [...prev.colorMedia, ...uploaded],
      }));

      toast.success(
        `${uploaded.length} ${type}${uploaded.length > 1 ? 's' : ''} uploaded`
      );
    } catch (err) {
      console.error('Media upload error:', err);
      toast.error(
        err.response?.data?.message || `Failed to upload ${type}`
      );
    } finally {
      setUploadingMedia({ color: null, type: null });
    }
  };

  const removeColorMedia = (color, url) => {
    setFormData((prev) => ({
      ...prev,
      colorMedia: prev.colorMedia.filter(
        (m) => !(m.color === color && m.url === url)
      ),
    }));
  };

  const calculatePreviewPrice = (variant) => {
    if (!variant.metal || !variant.metalWeight) return null;

    const matchedOption = metalOptions.find(
      (o) => o.metal === variant.metal && o.karat === (variant.metalKarat ?? 0)
    );

    let rate;
    if (matchedOption) {
      rate = matchedOption.ratePerGram;
      if (variant.metal === 'WHITE_GOLD') rate *= 1.01;
    } else {
      if (variant.metal === 'SILVER') rate = 120;
      else if (variant.metal === 'PLATINUM') rate = 3500;
      else if (variant.metal === 'WHITE_GOLD') rate = 7400;
      else if (variant.metal === 'ROSE_GOLD') rate = 7350;
      else rate = 7350;
    }

    const gemstoneWeight = parseFloat(variant.gemstoneWeight) || 0;
    let gemstoneRate = 0;
    if (variant.gemstoneRateId && gemstoneWeight > 0) {
      const gOpt = gemstoneOptions.find((o) => o.id === variant.gemstoneRateId);
      if (gOpt) gemstoneRate = gOpt.ratePerCarat;
    }
    const gemstonePrice = gemstoneWeight * gemstoneRate;

    const metalWeight = parseFloat(variant.metalWeight) || 0;
    const metalPrice = metalWeight * rate;
    const sideDiamondWeight = parseFloat(variant.sideDiamondWeight) || 0;
    const sideDiamondPrice = parseFloat(variant.sideDiamondPrice) || 0;
    const diamondPrice = sideDiamondWeight * sideDiamondPrice;
    const makingCharge = parseFloat(variant.makingChargeOverride) || 0;
    const stoneValue = parseFloat(variant.stoneValue) || 0;

    const subtotal =
      metalPrice + diamondPrice + gemstonePrice + makingCharge + stoneValue;
    const gst = subtotal * 0.03;
    const finalPrice = subtotal + gst;

    return {
      rate,
      metalPrice: Math.round(metalPrice),
      diamondPrice: Math.round(diamondPrice),
      gemstoneRate,
      gemstonePrice: Math.round(gemstonePrice),
      makingCharge: Math.round(makingCharge),
      stoneValue: Math.round(stoneValue),
      subtotal: Math.round(subtotal),
      gst: Math.round(gst),
      finalPrice: Math.round(finalPrice),
    };
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Product title is required');
        return;
      }
      if (formData.variants.length === 0) {
        toast.error('At least one variant is required');
        return;
      }

      const validVariants = formData.variants.filter(v => v.metal && v.metalWeight);
      if (validVariants.length === 0) {
        toast.error('At least one valid variant is required');
        return;
      }

      setSaving(true);

      const payload = {
        ...formData,
        variants: validVariants.map((v) => ({
          ...v,
          metalKarat: v.metalKarat ?? 18,
          gemstoneRateId: v.gemstoneRateId || null,
          diamondId: v.diamondId || null,
        })),
        metaKeywords: formData.metaKeywords.filter(k => k.trim()),
        tags: formData.tags.filter(t => t.trim()),
      };

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/products/${editId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Product updated successfully! 🎉');
      } else {
        await axios.post(
          'http://localhost:5000/api/products/premium',
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Product created successfully! 🎉');
      }

      navigate('/admin/products');
    } catch (error) {
      console.error('Save product error:', error);
      toast.error(
        error.response?.data?.message ||
        `Failed to ${isEditMode ? 'update' : 'create'} product`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all form data?')) {
      window.location.reload();
    }
  };

  if (isEditMode && loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <RefreshCw className="h-10 w-10 text-gold-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-3 sm:p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
              {isEditMode ? 'Edit Product' : 'Add Product'}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-500 mt-1">
              {isEditMode ? 'Update this jewellery product' : 'Create a new jewellery product'}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/products')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-white dark:hover:bg-dark-card transition text-sm sm:text-base self-start sm:self-auto flex-shrink-0"
          >
            ← Back
          </button>
        </div>

        {/* ============== BASIC INFO ============== */}
        <Section title="Basic Information" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <Field label="Title" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product Title"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>

            <Field label="Jewellery Type">
              <select
                value={formData.jewelleryType}
                onChange={(e) => setFormData({ ...formData, jewelleryType: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
              >
                <option value="">Select jewellery type</option>
                {masterData.jewelleryTypes.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
                {masterData.jewelleryTypes.length === 0 && (
                  <>
                    <option value="Ring">Ring</option>
                    <option value="Necklace">Necklace</option>
                    <option value="Earring">Earring</option>
                    <option value="Bracelet">Bracelet</option>
                    <option value="Pendant">Pendant</option>
                  </>
                )}
              </select>
            </Field>

            <Field label="Product Sizing">
              <div className="flex items-center gap-3 p-3 border border-gray-300 dark:border-dark-border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.productSizing === 'Free size'}
                  onChange={(e) => setFormData({
                    ...formData,
                    productSizing: e.target.checked ? 'Free size' : 'Sized'
                  })}
                  className="h-4 w-4 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white text-xs sm:text-sm">Free size</p>
                  <p className="text-xs text-gray-500">One size fits all — hides per-variant size selector</p>
                </div>
              </div>
            </Field>

            <Field label="Product Style">
              <input
                type="text"
                value={formData.productStyle}
                onChange={(e) => setFormData({ ...formData, productStyle: e.target.value })}
                placeholder="Select styles"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>

            <Field label="Collection">
              <select
                value={formData.collectionId}
                onChange={(e) => setFormData({ ...formData, collectionId: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
              >
                <option value="">Select collections</option>
                {masterData.collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Occasion">
              <input
                type="text"
                value={formData.occasion}
                onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                placeholder="Select occasions"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Description">
                <div className="border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-dark-bg px-3 py-2 border-b border-gray-200 dark:border-dark-border flex gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-bold">B</span>
                    <span className="italic">I</span>
                    <span className="underline">U</span>
                    <span>• List</span>
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Start writing..."
                    rows={5}
                    className="w-full px-3 sm:px-4 py-3 focus:outline-none bg-white dark:bg-dark-card resize-none text-sm sm:text-base"
                  />
                  <div className="px-3 py-1 text-xs text-gray-500 text-right border-t border-gray-200 dark:border-dark-border">
                    CHARS: {formData.description.length}
                  </div>
                </div>
              </Field>
            </div>
          </div>
        </Section>

        {/* ============== VARIANTS ============== */}
        {formData.variants.map((variant, vIndex) => (
          <Section key={vIndex} title={`Variant ${vIndex + 1}`} icon={Gem}>
            <div className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <Field label="Metal">
                  <select
                    value={
                      variant.metal && variant.metalKarat != null
                        ? `${variant.metal}-${variant.metalKarat}`
                        : ''
                    }
                    onChange={(e) => {
                      const selected = metalOptions.find((o) => o.key === e.target.value);
                      if (selected) {
                        updateVariant(vIndex, 'metal', selected.metal);
                        updateVariant(vIndex, 'metalKarat', selected.karat);
                      } else {
                        updateVariant(vIndex, 'metal', '');
                        updateVariant(vIndex, 'metalKarat', null);
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  >
                    <option value="">Select metal</option>
                    {metalOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                    {metalOptions.length === 0 && (
                      <>
                        <option value="GOLD-24">GOLD - 24K</option>
                        <option value="GOLD-22">GOLD - 22K</option>
                        <option value="GOLD-18">GOLD - 18K</option>
                        <option value="GOLD-14">GOLD - 14K</option>
                        <option value="SILVER-0">SILVER</option>
                        <option value="PLATINUM-0">PLATINUM</option>
                      </>
                    )}
                  </select>
                </Field>

                <Field label="Metal Weight in Gram">
                  <NumberInput
                    step="0.01"
                    value={variant.metalWeight}
                    onChange={(e) => updateVariant(vIndex, 'metalWeight', e.target.value)}
                    placeholder="Metal weight"
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  />
                </Field>

                <Field label="Metal Color">
                  <select
                    value={variant.metalColor}
                    onChange={(e) => updateVariant(vIndex, 'metalColor', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  >
                    <option value="">Select colors</option>
                    <option value="Rose">Rose Gold</option>
                    <option value="Yellow">Yellow Gold</option>
                    <option value="White">White Gold</option>
                  </select>
                </Field>

                <Field label="Product Size">
                  <select
                    value={variant.productSize}
                    onChange={(e) => updateVariant(vIndex, 'productSize', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  >
                    <option value="">Select sizes</option>
                    <option value="US 5">US 5</option>
                    <option value="US 6">US 6</option>
                    <option value="US 7">US 7</option>
                    <option value="US 8">US 8</option>
                    <option value="US 9">US 9</option>
                    <option value="US 10">US 10</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                <Field label="Gemstone">
                  <select
                    value={variant.gemstoneRateId || ''}
                    onChange={(e) => {
                      const selected = gemstoneOptions.find((o) => o.id === e.target.value);
                      if (selected) {
                        updateVariant(vIndex, 'gemstone', selected.type);
                        updateVariant(vIndex, 'gemstoneRateId', selected.id);
                      } else {
                        updateVariant(vIndex, 'gemstone', '');
                        updateVariant(vIndex, 'gemstoneRateId', '');
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  >
                    <option value="">Select gemstone</option>
                    {gemstoneOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Gemstone Weight in Carat">
                  <NumberInput
                    step="0.01"
                    value={variant.gemstoneWeight}
                    onChange={(e) => updateVariant(vIndex, 'gemstoneWeight', e.target.value)}
                    placeholder="Gemstone weight"
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  />
                </Field>

                <Field
                  label="Diamond (from inventory)"
                  hint="Optional — link a registered diamond."
                >
                  <select
                    value={variant.diamondId || ''}
                    onChange={(e) => updateVariant(vIndex, 'diamondId', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base truncate"
                  >
                    <option value="">None / Custom diamond</option>
                    {diamonds.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.shape} · {d.color} · {d.clarity} · {Number(d.carat).toFixed(2)}ct · ₹{Number(d.pricePerCarat).toLocaleString('en-IN')}/ct
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                <Field label="Number of Diamonds">
                  <NumberInput
                    value={variant.numberOfDiamonds}
                    onChange={(e) => updateVariant(vIndex, 'numberOfDiamonds', e.target.value)}
                    placeholder="Number of diamonds"
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  />
                </Field>

                <Field label="Number of Side Diamonds">
                  <NumberInput
                    value={variant.numberOfSideDiamonds}
                    onChange={(e) => updateVariant(vIndex, 'numberOfSideDiamonds', e.target.value)}
                    placeholder="Number of side diamonds"
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  />
                </Field>

                <Field label="Side Diamond Price (per carat)">
                  <NumberInput
                    step="0.01"
                    value={variant.sideDiamondPrice}
                    onChange={(e) => updateVariant(vIndex, 'sideDiamondPrice', e.target.value)}
                    placeholder="Price per carat"
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <Field label="Side Diamond Weight (carat)">
                  <NumberInput
                    step="0.01"
                    value={variant.sideDiamondWeight}
                    onChange={(e) => updateVariant(vIndex, 'sideDiamondWeight', e.target.value)}
                    placeholder="Total weight in carat"
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  />
                </Field>

                <Field label="Side Diamond Quality">
                  <input
                    type="text"
                    value={variant.sideDiamondQuality}
                    onChange={(e) => updateVariant(vIndex, 'sideDiamondQuality', e.target.value)}
                    placeholder="e.g., VVS-VS"
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <Field label="Karigar">
                  <select
                    value={variant.karigar}
                    onChange={(e) => updateVariant(vIndex, 'karigar', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  >
                    <option value="">Select karigar</option>
                    {masterData.karigars.map((k) => (
                      <option key={k.id} value={k.name}>{k.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Making Charge Weight Range">
                  <select
                    value={variant.makingChargeWeightRange}
                    onChange={(e) => updateVariant(vIndex, 'makingChargeWeightRange', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                  >
                    <option value="">Select weight range</option>
                    <option value="0-5g">0-5g</option>
                    <option value="5-10g">5-10g</option>
                    <option value="10-20g">10-20g</option>
                    <option value="20g+">20g+</option>
                  </select>
                </Field>
              </div>

              <Field
                label="Making Charge Override (₹)"
                hint="Leave empty to use the weight-tier making charge."
              >
                <NumberInput
                  step="0.01"
                  value={variant.makingChargeOverride}
                  onChange={(e) => updateVariant(vIndex, 'makingChargeOverride', e.target.value)}
                  placeholder="Optional — overrides the weight-tier rate"
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm sm:text-base"
                />
              </Field>

              <div className="border border-gray-200 dark:border-dark-border rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 text-xs sm:text-sm">
                  Semi-precious & Premium (POC)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  <Field label="Beads Weight (g)">
                    <NumberInput
                      step="0.01"
                      value={variant.beadsWeight}
                      onChange={(e) => updateVariant(vIndex, 'beadsWeight', e.target.value)}
                      placeholder="Non-gold beads deducted from gross"
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm"
                    />
                  </Field>

                  <Field label="Stone Subtract Weight (g)">
                    <NumberInput
                      step="0.01"
                      value={variant.stoneSubtractWeight}
                      onChange={(e) => updateVariant(vIndex, 'stoneSubtractWeight', e.target.value)}
                      placeholder="Semi-precious grams deducted from gold"
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm"
                    />
                  </Field>

                  <Field label="Stone Value (₹)">
                    <NumberInput
                      step="0.01"
                      value={variant.stoneValue}
                      onChange={(e) => updateVariant(vIndex, 'stoneValue', e.target.value)}
                      placeholder="Flat semi-precious stone value"
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm"
                    />
                  </Field>

                  <Field label="Custom-Order Premium Type">
                    <select
                      value={variant.customOrderPremiumType}
                      onChange={(e) => updateVariant(vIndex, 'customOrderPremiumType', e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm"
                    >
                      <option value="None">None</option>
                      <option value="Percent">Percent</option>
                      <option value="Fixed">Fixed</option>
                    </select>
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Custom-Order Premium Value">
                      <NumberInput
                        step="0.01"
                        value={variant.customOrderPremiumValue}
                        onChange={(e) => updateVariant(vIndex, 'customOrderPremiumValue', e.target.value)}
                        placeholder="% when Percent, ₹ when Fixed"
                        className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {variant.metal && variant.metalWeight && (
                <div className="p-3 sm:p-4 bg-gradient-to-br from-gold-50 to-gold-100 dark:from-gold-900/20 dark:to-gold-800/10 rounded-lg border border-gold-200 dark:border-gold-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="h-4 w-4 text-gold-600 flex-shrink-0" />
                    <span className="font-semibold text-gold-700 dark:text-gold-400 text-xs sm:text-sm">
                      Price Logic Preview
                    </span>
                  </div>
                  {(() => {
                    const preview = calculatePreviewPrice(variant);
                    if (!preview) return <p className="text-xs text-gray-500">Enter metal & weight</p>;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 text-xs">
                        <div>
                          <p className="text-gray-500">Metal Rate</p>
                          <p className="font-bold text-gray-800 dark:text-white">
                            ₹{Math.round(preview.rate).toLocaleString('en-IN')}/g
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Metal</p>
                          <p className="font-bold text-gray-800 dark:text-white">₹{preview.metalPrice.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Diamond</p>
                          <p className="font-bold text-gray-800 dark:text-white">₹{preview.diamondPrice.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Gemstone</p>
                          <p className="font-bold text-gray-800 dark:text-white">
                            ₹{preview.gemstonePrice.toLocaleString('en-IN')}
                            {preview.gemstoneRate > 0 && (
                              <span className="block text-[10px] text-gray-500">
                                @ ₹{preview.gemstoneRate.toLocaleString('en-IN')}/ct
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Making</p>
                          <p className="font-bold text-gray-800 dark:text-white">₹{preview.makingCharge.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="col-span-2 md:col-span-5 pt-2 border-t border-gold-200 flex items-baseline justify-between gap-2">
                          <p className="text-gray-500">Final Price (incl. 3% GST)</p>
                          <p className="font-bold text-gold-600 text-base sm:text-xl whitespace-nowrap">₹{preview.finalPrice.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-dark-border">
                {formData.variants.length > 1 && (
                  <button
                    onClick={() => removeVariant(vIndex)}
                    className="text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Remove Variant
                  </button>
                )}
              </div>
            </div>
          </Section>
        ))}

        <button
          onClick={addVariant}
          className="w-full mb-4 sm:mb-6 py-3 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg text-gray-600 dark:text-gray-400 hover:border-gold-500 hover:text-gold-600 transition flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Add Variant
        </button>

        {/* ============== STOCK & COMPLIANCE ============== */}
        <Section title="Stock & Compliance" icon={Package}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <Field label="Stock">
              <NumberInput
                value={formData.variants[0]?.stock ?? ''}
                onChange={(e) => updateVariant(0, 'stock', e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>

            <Field label="GST (%)">
              <NumberInput
                step="0.01"
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>

            <Field label="SKU (optional)" hint="Leave empty and the system will generate a SKU automatically.">
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Leave empty to auto-generate"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>

            <Field label="Return Policy">
              <select
                value={formData.returnPolicy}
                onChange={(e) => setFormData({ ...formData, returnPolicy: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm sm:text-base"
              >
                <option>Apply global Return Policy</option>
                <option>7-Day Return</option>
                <option>14-Day Return</option>
                <option>30-Day Return</option>
                <option>No Return</option>
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Note" hint="Manage the content in Master Panel → Return Policy & Note.">
                <select
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm sm:text-base"
                >
                  <option>Apply global Note</option>
                  <option>No Note</option>
                </select>
              </Field>
            </div>
          </div>
        </Section>

        {/* ============== SHIPPING ============== */}
        <Section title="Shipping" icon={Truck}>
          <p className="text-xs text-gray-500 mb-4">
            No default set for this jewellery type — add one in Master Panel → Shipping Dimensions to stop retyping it.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <Field label="Length">
              <NumberInput
                step="0.01"
                value={formData.shippingLength}
                onChange={(e) => setFormData({ ...formData, shippingLength: e.target.value })}
                placeholder="Mention Length"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>
            <Field label="Width">
              <NumberInput
                step="0.01"
                value={formData.shippingWidth}
                onChange={(e) => setFormData({ ...formData, shippingWidth: e.target.value })}
                placeholder="Mention Width"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>
            <Field label="Height">
              <NumberInput
                step="0.01"
                value={formData.shippingHeight}
                onChange={(e) => setFormData({ ...formData, shippingHeight: e.target.value })}
                placeholder="Mention Height"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>
          </div>
        </Section>

        {/* ============== SCREW OPTIONS ============== */}
        <Section title="Screw Options" icon={Zap}>
          <div className="space-y-4">
            {formData.screwOptions.map((screw, index) => (
              <div key={index} className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  <Field label="Screw Type">
                    <input
                      type="text"
                      value={screw.screwType}
                      onChange={(e) => updateScrewOption(index, 'screwType', e.target.value)}
                      placeholder="Screw Type"
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-sm sm:text-base"
                    />
                  </Field>
                  <Field label="Screw Material">
                    <input
                      type="text"
                      value={screw.screwMaterial}
                      onChange={(e) => updateScrewOption(index, 'screwMaterial', e.target.value)}
                      placeholder="Screw Material"
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-sm sm:text-base"
                    />
                  </Field>
                  <Field label="Notes">
                    <input
                      type="text"
                      value={screw.notes}
                      onChange={(e) => updateScrewOption(index, 'notes', e.target.value)}
                      placeholder="Notes"
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-sm sm:text-base"
                    />
                  </Field>
                </div>
                {formData.screwOptions.length > 1 && (
                  <button
                    onClick={() => removeScrewOption(index)}
                    className="mt-2 text-red-600 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addScrewOption}
              className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-bg transition flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Option
            </button>
          </div>

          <label className="flex items-start gap-2 mt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.continueSelling}
              onChange={(e) => setFormData({ ...formData, continueSelling: e.target.checked })}
              className="h-4 w-4 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              Continuing selling when out of stock
            </span>
          </label>
        </Section>

        {/* ============== PRODUCT MEDIA ============== */}
        <Section title="Product Media (Color-wise)" icon={ImageIcon}>
          <p className="text-xs text-gray-500 mb-4">
            Upload images/videos once per metal color. Every purity variant using that color gets the same media automatically.
          </p>

          {usedColors.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl p-6 sm:p-8 text-center">
              <p className="text-xs sm:text-sm text-gray-500">
                Select at least one metal color in a variant to upload images.
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {usedColors.map((color) => {
                const colorItems = formData.colorMedia.filter((m) => m.color === color);
                const images = colorItems.filter((m) => m.type === 'image');
                const videos = colorItems.filter((m) => m.type === 'video');

                return (
                  <div
                    key={color}
                    className="border border-gray-200 dark:border-dark-border rounded-xl p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border border-gray-300 flex-shrink-0 ${
                            color === 'Rose'
                              ? 'bg-rose-300'
                              : color === 'Yellow'
                              ? 'bg-yellow-400'
                              : 'bg-gray-200'
                          }`}
                        />
                        <h4 className="font-semibold text-gray-800 dark:text-white text-xs sm:text-sm truncate">
                          {color} Gold
                        </h4>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          ({images.length} image{images.length !== 1 ? 's' : ''}
                          {videos.length > 0 ? `, ${videos.length} video` : ''})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mb-3">
                      {images.map((media, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border group bg-gray-50"
                          style={{ aspectRatio: '1 / 1', minHeight: '100px' }}
                        >
                          <img
                            src={media.url}
                            alt={`${color} ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.background = '#fee2e2';
                            }}
                          />
                          {idx === 0 && (
                            <span className="absolute top-1 left-1 bg-gold-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeColorMedia(color, media.url)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                            title="Remove"
                            aria-label="Remove media"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {uploadingMedia.color === color && uploadingMedia.type === 'image' ? (
                        <div className="aspect-square flex items-center justify-center border-2 border-dashed border-gold-400 rounded-lg bg-gold-50 dark:bg-gold-900/20">
                          <RefreshCw className="h-5 w-5 text-gold-600 animate-spin" />
                        </div>
                      ) : (
                        <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg cursor-pointer hover:border-gold-500 hover:bg-gold-50 dark:hover:bg-gold-900/10 transition">
                          <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">Add Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleMediaUpload(color, 'image', e.target.files)}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {videos.length > 0 ? (
                        videos.map((media, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-gray-50 dark:bg-dark-bg px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border max-w-full"
                          >
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[140px] sm:max-w-[200px]">
                              {media.url.split('/').pop()}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeColorMedia(color, media.url)}
                              className="text-red-500 hover:text-red-700 flex-shrink-0"
                              aria-label="Remove video"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      ) : uploadingMedia.color === color && uploadingMedia.type === 'video' ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Uploading video...
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-dark-border rounded-lg cursor-pointer hover:border-gold-500 text-xs text-gray-600 dark:text-gray-400">
                          <Plus className="h-3.5 w-3.5" /> Add Video
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleMediaUpload(color, 'video', e.target.files)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ============== SEO ============== */}
        <Section title="SEO" icon={Tag}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <Field label="Meta Title">
              <input
                type="text"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                placeholder="Meta Title"
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm sm:text-base"
              />
            </Field>

            <Field label="Meta Description">
              <textarea
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                placeholder="Description"
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg resize-none text-sm sm:text-base"
              />
            </Field>

            <Field
              label="Meta Keywords"
              action={
                <button
                  onClick={addKeyword}
                  className="text-xs text-gold-600 hover:text-gold-700 font-medium flex items-center gap-1 flex-shrink-0"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              }
            >
              <div className="space-y-2">
                {formData.metaKeywords.map((keyword, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => updateKeyword(i, e.target.value)}
                      placeholder="Enter keyword"
                      className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
                    />
                    {formData.metaKeywords.length > 1 && (
                      <button
                        onClick={() => removeKeyword(i)}
                        className="p-2 text-red-500 hover:text-red-700 flex-shrink-0"
                        aria-label="Remove keyword"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Field>

            <Field label="Home Page Sections">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBestSeller}
                    onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                    className="h-4 w-4 text-gold-600 rounded flex-shrink-0"
                  />
                  <span className="text-sm">Best Seller</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFastDelivery}
                    onChange={(e) => setFormData({ ...formData, isFastDelivery: e.target.checked })}
                    className="h-4 w-4 text-gold-600 rounded flex-shrink-0"
                  />
                  <span className="text-sm">Fast Delivery</span>
                </label>
                <p className="text-xs text-gray-500">
                  Tagged products appear in the corresponding home page carousel.
                </p>
              </div>
            </Field>

            <div className="md:col-span-2">
              <Field
                label="Tags"
                action={
                  <button
                    onClick={addTag}
                    className="text-xs text-gold-600 hover:text-gold-700 font-medium flex items-center gap-1 flex-shrink-0"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                }
              >
                <div className="space-y-2">
                  {formData.tags.map((tag, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => updateTag(i, e.target.value)}
                        placeholder="Enter tag"
                        className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
                      />
                      {formData.tags.length > 1 && (
                        <button
                          onClick={() => removeTag(i)}
                          className="p-2 text-red-500 hover:text-red-700 flex-shrink-0"
                          aria-label="Remove tag"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        </Section>

        {/* ============== ACTIONS ============== */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pb-10">
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-6 py-3 border border-gray-300 dark:border-dark-border rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-bg transition text-sm sm:text-base"
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 bg-gray-900 dark:bg-gold-600 hover:bg-gray-800 dark:hover:bg-gold-700 text-white rounded-lg font-semibold transition disabled:opacity-50 text-sm sm:text-base"
          >
            {saving
              ? (isEditMode ? 'Updating...' : 'Creating...')
              : (isEditMode ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;