/**
 * @fileoverview Floor Form Page
 * @description Form page for creating and editing floor maps.
 *
 * @module pages/FloorFormPage
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Upload,
  Plus,
  Trash2,
  MapPin,
  GitBranch,
  Camera,
  AlertTriangle,
  Power,
} from 'lucide-react';
import { Card, Button, Input, Select } from '../components/ui';
import { cn } from '../utils/helpers';
import {
  createFloor,
  updateFloor,
  fetchFloorById,
  selectCurrentFloor,
  selectFloorsLoading,
} from '../store/slices/floorsSlice';
import { showSuccess, showError } from '../store/slices/uiSlice';
import { buildFloorFormData } from '../services/floorService';
import { NODE_TYPES, STATUS, ROUTES } from '../config';

/* ============================================================
 * INITIAL FORM STATE
 * ============================================================ */

const initialFormState = {
  id: '',
  name: '',
  status: 'active',
  widthMeters: '',
  heightMeters: '',
  nodes: [],
  edges: [],
  cameras: [],
  startPoints: '',
  exitPoints: '',
};

const initialNodeState = { id: '', x: '', y: '', label: '', type: 'room' };
const initialEdgeState = { id: '', from: '', to: '', staticWeight: '1', peopleThreshold: '10', fireThreshold: '0.7', smokeThreshold: '0.6' };
const initialCameraState = { cameraId: '', edgeId: '' };

/* ============================================================
 * FLOOR FORM PAGE COMPONENT
 * ============================================================ */

export function FloorFormPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const currentFloor = useSelector(selectCurrentFloor);
  const loading = useSelector(selectFloorsLoading);

  const [form, setForm] = useState(initialFormState);
  const [mapImage, setMapImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});

  // Load floor data for editing
  useEffect(() => {
    if (isEdit && id) {
      dispatch(fetchFloorById(id));
    }
  }, [dispatch, isEdit, id]);

  // Populate form with floor data
  useEffect(() => {
    if (isEdit && currentFloor) {
      // Handle both formats: cameras array (new) or cameraToEdge object (legacy)
      let cameras = [];
      if (Array.isArray(currentFloor.cameras)) {
        cameras = currentFloor.cameras.map(cam => ({ cameraId: cam.id, edgeId: cam.edgeId }));
      } else if (currentFloor.cameraToEdge) {
        cameras = Object.entries(currentFloor.cameraToEdge).map(([cameraId, edgeId]) => ({ cameraId, edgeId }));
      }

      // Handle startPoints - could come from screens array or startPoints array
      let startPoints = '';
      if (Array.isArray(currentFloor.screens)) {
        startPoints = currentFloor.screens.map(s => s.nodeId).join(', ');
      } else if (Array.isArray(currentFloor.startPoints)) {
        startPoints = currentFloor.startPoints.join(', ');
      }

      setForm({
        id: currentFloor.id || '',
        name: currentFloor.name || '',
        status: currentFloor.status || 'active',
        widthMeters: currentFloor.mapImage?.widthMeters || '',
        heightMeters: currentFloor.mapImage?.heightMeters || '',
        nodes: currentFloor.nodes || [],
        edges: currentFloor.edges || [],
        cameras,
        startPoints,
        exitPoints: (currentFloor.exitPoints || []).join(', '),
      });

      if (currentFloor.mapImage?.url || currentFloor.mapImage?.localUrl) {
        setImagePreview(currentFloor.mapImage.url || currentFloor.mapImage.localUrl);
      }
    }
  }, [isEdit, currentFloor]);

  // Handle form field change
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMapImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Add/Update/Remove node
  const addNode = () => {
    setForm(prev => ({
      ...prev,
      nodes: [...prev.nodes, { ...initialNodeState, id: `N${prev.nodes.length + 1}` }],
    }));
  };

  const updateNode = (index, field, value) => {
    const newNodes = [...form.nodes];
    newNodes[index] = { ...newNodes[index], [field]: value };
    setForm(prev => ({ ...prev, nodes: newNodes }));
  };

  const removeNode = (index) => {
    setForm(prev => ({
      ...prev,
      nodes: prev.nodes.filter((_, i) => i !== index),
    }));
  };

  // Add/Update/Remove edge
  const addEdge = () => {
    setForm(prev => ({
      ...prev,
      edges: [...prev.edges, { ...initialEdgeState, id: `E${prev.edges.length + 1}` }],
    }));
  };

  const updateEdge = (index, field, value) => {
    const newEdges = [...form.edges];
    newEdges[index] = { ...newEdges[index], [field]: value };
    setForm(prev => ({ ...prev, edges: newEdges }));
  };

  const removeEdge = (index) => {
    setForm(prev => ({
      ...prev,
      edges: prev.edges.filter((_, i) => i !== index),
    }));
  };

  // Add/Update/Remove camera
  const addCamera = () => {
    setForm(prev => ({
      ...prev,
      cameras: [...prev.cameras, { ...initialCameraState }],
    }));
  };

  const updateCamera = (index, field, value) => {
    const newCameras = [...form.cameras];
    newCameras[index] = { ...newCameras[index], [field]: value };
    setForm(prev => ({ ...prev, cameras: newCameras }));
  };

  const removeCamera = (index) => {
    setForm(prev => ({
      ...prev,
      cameras: prev.cameras.filter((_, i) => i !== index),
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!form.id.trim()) newErrors.id = 'Floor ID is required';
    if (!form.name.trim()) newErrors.name = 'Floor name is required';
    if (!isEdit && !mapImage) newErrors.mapImage = 'Floor map image is required';
    if (form.nodes.length === 0) newErrors.nodes = 'At least one node is required';
    if (form.edges.length === 0) newErrors.edges = 'At least one edge is required';
    if (!form.exitPoints.trim()) newErrors.exitPoints = 'Exit points are required';
    if (!form.startPoints.trim()) newErrors.startPoints = 'Start points are required';

    // Validate nodes have required fields
    form.nodes.forEach((node, i) => {
      if (!node.id || !node.x || !node.y) {
        newErrors[`node_${i}`] = 'Node ID, X, and Y are required';
      }
    });

    // Validate edges have required fields
    form.edges.forEach((edge, i) => {
      if (!edge.id || !edge.from || !edge.to) {
        newErrors[`edge_${i}`] = 'Edge ID, From, and To are required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      dispatch(showError('Please fix the form errors'));
      return;
    }

    try {
      // Convert cameras array to object
      const cameraToEdge = {};
      form.cameras.forEach(cam => {
        if (cam.cameraId && cam.edgeId) {
          cameraToEdge[cam.cameraId] = cam.edgeId;
        }
      });

      // Parse nodes with proper types
      const nodes = form.nodes.map(node => ({
        id: node.id,
        x: parseFloat(node.x),
        y: parseFloat(node.y),
        label: node.label || node.id,
        type: node.type || 'room',
      }));

      // Parse edges with proper types
      const edges = form.edges.map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        staticWeight: parseFloat(edge.staticWeight) || 1,
        peopleThreshold: parseInt(edge.peopleThreshold) || 10,
        fireThreshold: parseFloat(edge.fireThreshold) || 0.7,
        smokeThreshold: parseFloat(edge.smokeThreshold) || 0.6,
      }));

      // Parse points
      const startPoints = form.startPoints.split(',').map(s => s.trim()).filter(Boolean);
      const exitPoints = form.exitPoints.split(',').map(s => s.trim()).filter(Boolean);

      const floorData = {
        id: form.id,
        name: form.name,
        status: form.status,
        nodes,
        edges,
        cameraToEdge,
        startPoints,
        exitPoints,
        widthMeters: form.widthMeters ? parseFloat(form.widthMeters) : null,
        heightMeters: form.heightMeters ? parseFloat(form.heightMeters) : null,
      };

      const formData = buildFloorFormData(floorData, mapImage);

      if (isEdit) {
        await dispatch(updateFloor({ floorId: id, formData })).unwrap();
        dispatch(showSuccess('Floor updated successfully'));
      } else {
        await dispatch(createFloor(formData)).unwrap();
        dispatch(showSuccess('Floor created successfully'));
      }

      navigate(ROUTES.FLOORS);
    } catch (err) {
      dispatch(showError(err || 'Failed to save floor'));
    }
  };

  const nodeOptions = form.nodes.map(n => ({ value: n.id, label: n.id }));
  const edgeOptions = form.edges.map(e => ({ value: e.id, label: e.id }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(ROUTES.FLOORS)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Floor' : 'Add New Floor'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? 'Update floor configuration' : 'Create a new floor map with nodes and edges'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card title="Basic Information">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Floor ID *"
                placeholder="e.g., floor_1"
                value={form.id}
                onChange={(e) => handleChange('id', e.target.value)}
                error={errors.id}
                disabled={isEdit}
              />
              <Input
                label="Floor Name *"
                placeholder="e.g., Ground Floor"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Width (meters)"
                type="number"
                step="0.1"
                placeholder="e.g., 50"
                value={form.widthMeters}
                onChange={(e) => handleChange('widthMeters', e.target.value)}
                hint="Real-world width for distance calculations"
              />
              <Input
                label="Height (meters)"
                type="number"
                step="0.1"
                placeholder="e.g., 30"
                value={form.heightMeters}
                onChange={(e) => handleChange('heightMeters', e.target.value)}
                hint="Real-world height for distance calculations"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor Status
                </label>
                <Select
                  options={STATUS.FLOOR.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  icon={<Power className="w-4 h-4" />}
                />
                <p className="mt-1 text-xs text-gray-500">Enable or disable the floor</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Map Image */}
        <Card title="Floor Map Image">
          <div className="p-6">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Floor map preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('mapImage').click()}
                  >
                    <Upload className="w-4 h-4" />
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-gray-600">Upload your floor plan image</p>
                    <p className="text-sm text-gray-400">PNG, JPG, WEBP up to 10MB</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('mapImage').click()}
                  >
                    Select File
                  </Button>
                </div>
              )}
              <input
                id="mapImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            {errors.mapImage && (
              <p className="text-sm text-danger-500 mt-2">{errors.mapImage}</p>
            )}
          </div>
        </Card>

        {/* Nodes */}
        <Card
          title="Nodes (Points on Map)"
          action={
            <Button type="button" variant="outline" size="small" onClick={addNode}>
              <Plus className="w-4 h-4" /> Add Node
            </Button>
          }
        >
          <div className="p-6 space-y-4">
            {form.nodes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No nodes added yet. Click "Add Node" to start.
              </p>
            ) : (
              form.nodes.map((node, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400 mt-2" />
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Input
                      placeholder="ID"
                      value={node.id}
                      onChange={(e) => updateNode(index, 'id', e.target.value)}
                    />
                    <Input
                      placeholder="X"
                      type="number"
                      value={node.x}
                      onChange={(e) => updateNode(index, 'x', e.target.value)}
                    />
                    <Input
                      placeholder="Y"
                      type="number"
                      value={node.y}
                      onChange={(e) => updateNode(index, 'y', e.target.value)}
                    />
                    <Input
                      placeholder="Label"
                      value={node.label}
                      onChange={(e) => updateNode(index, 'label', e.target.value)}
                    />
                    <Select
                      options={NODE_TYPES}
                      value={node.type}
                      onChange={(e) => updateNode(index, 'type', e.target.value)}
                      placeholder=""
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={() => removeNode(index)}
                  >
                    <Trash2 className="w-4 h-4 text-danger-500" />
                  </Button>
                </div>
              ))
            )}
            {errors.nodes && (
              <p className="text-sm text-danger-500">{errors.nodes}</p>
            )}
          </div>
        </Card>

        {/* Edges */}
        <Card
          title="Edges (Connections)"
          action={
            <Button type="button" variant="outline" size="small" onClick={addEdge}>
              <Plus className="w-4 h-4" /> Add Edge
            </Button>
          }
        >
          <div className="p-6 space-y-4">
            {form.edges.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No edges added yet. Click "Add Edge" to start.
              </p>
            ) : (
              form.edges.map((edge, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <GitBranch className="w-5 h-5 text-gray-400 mt-2" />
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <Input
                      placeholder="ID"
                      value={edge.id}
                      onChange={(e) => updateEdge(index, 'id', e.target.value)}
                    />
                    <Select
                      options={nodeOptions}
                      value={edge.from}
                      onChange={(e) => updateEdge(index, 'from', e.target.value)}
                      placeholder="From"
                    />
                    <Select
                      options={nodeOptions}
                      value={edge.to}
                      onChange={(e) => updateEdge(index, 'to', e.target.value)}
                      placeholder="To"
                    />
                    <Input
                      placeholder="Weight"
                      type="number"
                      step="0.1"
                      value={edge.staticWeight}
                      onChange={(e) => updateEdge(index, 'staticWeight', e.target.value)}
                    />
                    <Input
                      placeholder="People Thresh"
                      type="number"
                      value={edge.peopleThreshold}
                      onChange={(e) => updateEdge(index, 'peopleThreshold', e.target.value)}
                    />
                    <Input
                      placeholder="Fire Thresh"
                      type="number"
                      step="0.1"
                      value={edge.fireThreshold}
                      onChange={(e) => updateEdge(index, 'fireThreshold', e.target.value)}
                    />
                    <Input
                      placeholder="Smoke Thresh"
                      type="number"
                      step="0.1"
                      value={edge.smokeThreshold}
                      onChange={(e) => updateEdge(index, 'smokeThreshold', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={() => removeEdge(index)}
                  >
                    <Trash2 className="w-4 h-4 text-danger-500" />
                  </Button>
                </div>
              ))
            )}
            {errors.edges && (
              <p className="text-sm text-danger-500">{errors.edges}</p>
            )}
          </div>
        </Card>

        {/* Cameras */}
        <Card
          title="Camera Mappings"
          action={
            <Button type="button" variant="outline" size="small" onClick={addCamera}>
              <Plus className="w-4 h-4" /> Add Camera
            </Button>
          }
        >
          <div className="p-6 space-y-4">
            {form.cameras.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No cameras added yet. Click "Add Camera" to map cameras to edges.
              </p>
            ) : (
              form.cameras.map((camera, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Camera className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Camera ID (e.g., CAM_01)"
                      value={camera.cameraId}
                      onChange={(e) => updateCamera(index, 'cameraId', e.target.value)}
                    />
                    <Select
                      options={edgeOptions}
                      value={camera.edgeId}
                      onChange={(e) => updateCamera(index, 'edgeId', e.target.value)}
                      placeholder="Select Edge"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={() => removeCamera(index)}
                  >
                    <Trash2 className="w-4 h-4 text-danger-500" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Start & Exit Points */}
        <Card title="Start & Exit Points">
          <div className="p-6 space-y-4">
            <Input
              label="Start Points (Screen Locations) *"
              placeholder="N1, N2, N3 (comma-separated node IDs)"
              value={form.startPoints}
              onChange={(e) => handleChange('startPoints', e.target.value)}
              error={errors.startPoints}
              hint="Node IDs where screens are located"
            />
            <Input
              label="Exit Points *"
              placeholder="EXIT_A, EXIT_B (comma-separated node IDs)"
              value={form.exitPoints}
              onChange={(e) => handleChange('exitPoints', e.target.value)}
              error={errors.exitPoints}
              hint="Node IDs that are emergency exits"
            />
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.FLOORS)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading.create || loading.update}
          >
            <Save className="w-4 h-4" />
            {isEdit ? 'Update Floor' : 'Create Floor'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default FloorFormPage;
