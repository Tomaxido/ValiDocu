// TODO: ¿eliminar?

// import React, { useState, useEffect } from "react";
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   Button, Typography, Box, List, ListItem, ListItemText,
//   Chip, IconButton, TextField, Divider, CircularProgress
// } from "@mui/material";
// import { Check, X, Clock } from "lucide-react";
// import { getPendingAccessRequests, reviewAccessRequest } from "../../utils/api";
// import type { AccessRequest } from "../../utils/interfaces";

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
// }

// export default function PendingRequestsModal({ isOpen, onClose }: Props) {
//   const [requests, setRequests] = useState<AccessRequest[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [reviewingId, setReviewingId] = useState<number | null>(null);
//   const [adminComment, setAdminComment] = useState("");

//   const loadPendingRequests = async () => {
//     setLoading(true);
//     try {
//       const response = await getPendingAccessRequests();
//       console.log("Pending access requests:", response);
//       setRequests(response.requests || []);
//     } catch (error) {
//       console.error('Error loading pending requests:', error);
//       alert("Error al cargar las solicitudes pendientes");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isOpen) {
//       loadPendingRequests();
//     }
//   }, [isOpen]);

//   const handleReview = async (requestId: number, action: 'approve' | 'reject') => {
//     setReviewingId(requestId);
//     try {
//       await reviewAccessRequest(requestId, action, adminComment);
      
//       alert(`Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'} correctamente`);
      
//       // Recargar la lista
//       await loadPendingRequests();
//       setAdminComment("");
//     } catch (error: any) {
//       console.error('Error reviewing request:', error);
//       alert(error.message || "Error al procesar la solicitud");
//     } finally {
//       setReviewingId(null);
//     }
//   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString('es-ES', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   return (
//     <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
//       <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//         <Clock size={24} />
//         Solicitudes de acceso pendientes
//       </DialogTitle>

//       <DialogContent>
//         {loading ? (
//           <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
//             <CircularProgress />
//           </Box>
//         ) : requests.length === 0 ? (
//           <Typography color="text.secondary" sx={{ textAlign: 'center', p: 3 }}>
//             No hay solicitudes pendientes
//           </Typography>
//         ) : (
//           <Box>
//             <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
//               Solicitudes ordenadas por antigüedad (más antiguas primero)
//             </Typography>
            
//             <List>
//               {requests.map((request, index) => (
//                 <Box key={request.id}>
//                   <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch', p: 2 }}>
//                     <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
//                       <Box sx={{ flex: 1 }}>
//                         <Typography variant="h6" sx={{ mb: 0.5 }}>
//                           {request.group.name}
//                         </Typography>
//                         <Typography variant="body2" color="text.secondary">
//                           <strong>Solicitante:</strong> {request.requesting_user.name} ({request.requesting_user.email})
//                         </Typography>
//                         <Typography variant="body2" color="text.secondary">
//                           <strong>Para usuario:</strong> {request.requested_user.name} ({request.requested_user.email})
//                         </Typography>
//                         <Typography variant="body2" color="text.secondary">
//                           <strong>Fecha:</strong> {formatDate(request.created_at)}
//                         </Typography>
//                       </Box>
//                       <Chip 
//                         label={request.permission_text} 
//                         color={request.permission_type === 1 ? "warning" : "info"}
//                         size="small"
//                       />
//                     </Box>

//                     {request.request_reason && (
//                       <Box sx={{ mb: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
//                         <Typography variant="body2">
//                           <strong>Razón:</strong> {request.request_reason}
//                         </Typography>
//                       </Box>
//                     )}

//                     <TextField
//                       label="Comentario del administrador (opcional)"
//                       multiline
//                       rows={2}
//                       fullWidth
//                       value={adminComment}
//                       onChange={(e) => setAdminComment(e.target.value)}
//                       sx={{ mb: 2 }}
//                       disabled={reviewingId === request.id}
//                     />

//                     <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
//                       <Button
//                         variant="outlined"
//                         color="error"
//                         startIcon={<X size={16} />}
//                         onClick={() => handleReview(request.id, 'reject')}
//                         disabled={reviewingId === request.id}
//                       >
//                         {reviewingId === request.id ? "Procesando..." : "Rechazar"}
//                       </Button>
//                       <Button
//                         variant="contained"
//                         color="success"
//                         startIcon={<Check size={16} />}
//                         onClick={() => handleReview(request.id, 'approve')}
//                         disabled={reviewingId === request.id}
//                       >
//                         {reviewingId === request.id ? "Procesando..." : "Aprobar"}
//                       </Button>
//                     </Box>
//                   </ListItem>
//                   {index < requests.length - 1 && <Divider />}
//                 </Box>
//               ))}
//             </List>
//           </Box>
//         )}
//       </DialogContent>

//       <DialogActions>
//         <Button onClick={onClose}>Cerrar</Button>
//       </DialogActions>
//     </Dialog>
//   );
// }