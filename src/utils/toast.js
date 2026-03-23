import { toast as reactHotToast } from 'react-hot-toast';

const toast = {
    success: (msg) => reactHotToast.success(msg),
    error: (msg) => reactHotToast.error(msg),
    info: (msg) => reactHotToast(msg, { icon: 'ℹ️' }),
    loading: (msg) => reactHotToast.loading(msg),
    dismiss: (id) => reactHotToast.dismiss(id)
};

export default toast;
