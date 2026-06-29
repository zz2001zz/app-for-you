'use client';
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';

interface FormData {
  time: string;
  specificTime: string;
  location: string;
  message: string;
}

interface AvailableDate {
  value: string;
  label: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({ time: '', specificTime: '', location: '', message: '' });
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [popupMessage, setPopupMessage] = useState<string>('');
  const [showBusyPopup, setShowBusyPopup] = useState<boolean>(false);
  const [isBusyEnd, setIsBusyEnd] = useState<boolean>(false);

  // Đọc link API tự động từ môi trường config của Railway/Vercel
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  useEffect(() => {
    const dates: AvailableDate[] = [];
    const startDate = new Date(2026, 6, 11);

    for (let i = 0; i < 14; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dayOfWeek = currentDate.getDay();

      if (dayOfWeek === 6 || dayOfWeek === 0) {
        const dayLabel = dayOfWeek === 6 ? 'Thứ Bảy' : 'Chủ Nhật';
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const valueDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

        dates.push({
          value: valueDate,
          label: `${dayLabel} (Ngày ${formattedDate})`
        });
      }
    }
    setAvailableDates(dates);
  }, []);

  useEffect(() => {
    if (isSubmitted || isBusyEnd) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSubmitted, isBusyEnd]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.time) {
      setPopupMessage("Cậu ơi, chọn ngày đi chơi với tớ đã nèee =(");
      setShowPopup(true);
      return;
    }
    if (!formData.specificTime) {
      setPopupMessage("Khung giờ nào thì hợp lý nhất nhỉ, cậu chọn giúp tớ với");
      setShowPopup(true);
      return;
    }
    if (!formData.location) {
      setPopupMessage("Chúng mình đi đâu được nhỉ, cậu gợi ý một nơi đi nha");
      setShowPopup(true);
      return;
    }

    setLoading(true);

    const payload = {
      time: `${formData.time} [Khung giờ: ${formData.specificTime}]`,
      location: formData.location,
      message: formData.message
    };

    try {
      const res = await fetch(`${API_URL}/api/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        setPopupMessage('Có lỗi xảy ra, thử lại giúp tớ nhé');
        setShowPopup(true);
      }
    } catch (error) {
      console.error(error);
      setPopupMessage('Không thể kết nối đến Backend rồi');
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBusy = async () => {
    setShowBusyPopup(false);

    try {
      await fetch(`${API_URL}/api/busy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: formData.message || "Không có lời nhắn"
        }),
      });
    } catch (error) {
      console.error("Không update được trạng thái bận:", error);
    }

    setPopupMessage("Huhu, khi nào hết bận phải bù cho tớ đó nha 😭");
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    if (popupMessage === "Huhu, khi nào hết bận phải bù cho tớ đó nha 😭") {
      setIsBusyEnd(true);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-4 selection:bg-pink-200 relative">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-pink-100 text-center">

        {isBusyEnd ? (
          <div className="py-8">
            <span className="text-6xl inline-block animate-bounce">🍂</span>
            <h2 className="text-2xl font-bold text-pink-600 mt-4">Hẹn gặp cậu vào một ngày không xa</h2>
            <p className="text-gray-500 mt-2">Tớ vẫn luôn ở đây chờ cậu nè 😉</p>
          </div>
        ) : !isSubmitted ? (
          <>
            <span className="text-4xl">💌</span>
            <h1 className="text-2xl font-bold text-pink-600 mt-2 mb-1">Cậu có hẹn với tớ chứ?</h1>
            <p className="text-gray-500 text-sm mb-6">Chọn thời gian và địa điểm cậu muốn đi nhé</p>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khi nào cậu rảnh nè? </label>
                <select
                  className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-700 bg-white"
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, time: e.target.value })}
                >
                  <option value="">Chọn một ngày cuối tuần</option>
                  {availableDates.map((date, index) => (
                    <option key={index} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khung giờ nào thì hợp lý nhất nhỉ?</label>
                <select
                  className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-700 bg-white"
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, specificTime: e.target.value })}
                >
                  <option value="">Chọn một buổi trong ngày</option>
                  <option value="Buổi sáng (8:30 - 11:30)">Buổi sáng mát mẻ (8:30 - 11:30) </option>
                  <option value="Buổi chiều (14:30 - 17:30)">Buổi chiều nhẹ nhàng (14:30 - 17:30) </option>
                  <option value="Buổi tối (19:00 - 22:00)">Buổi tối lung linh (19:00 - 22:00) </option>
                  <option value="Giờ giấc tùy ý tớ">Giờ nào cũng được, tớ quyết định sau nha </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cậu muốn chúng mình đi đâu đây?</label>
                <select
                  className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-700 bg-white"
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="">Chọn một nơi cậu thích</option>
                  <option value="Cà phê nhẹ nhàng">Cà phê chuyện trò</option>
                  <option value="Đi ăn đồ nướng/lẩu">Đi ăn món gì đó ngon ngon </option>
                  <option value="Đi xem phim">Rạp chiếu phim</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lời nhắn cho tớ (nếu có):</label>
                <textarea
                  className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-700 h-20 resize-none"
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBusyPopup(true)}
                  className="w-1/3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 font-medium rounded-xl transition duration-200"
                >
                  Tớ bận òi 😢
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-xl shadow-md transition duration-200 disabled:bg-pink-300"
                >
                  {loading ? 'Đang gửi...' : 'Gửi cho tớ ngay 🚀'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-8">
            <span className="text-6xl inline-block animate-bounce">💖</span>
            <h2 className="text-2xl font-bold text-pink-600 mt-4">Gửi thành công rồi nè</h2>
            <p className="text-gray-600 mt-2">
              Tớ đã nhận được lịch hẹn <br />
              Chờ tớ qua đón cậu đi chơi nhé 😉
            </p>
          </div>
        )}
      </div>

      {/* POPUP 1 */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-pink-100 text-center">
            <p className="text-gray-700 font-medium mt-4 mb-6 leading-relaxed">{popupMessage}</p>
            <button
              onClick={handleClosePopup}
              className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-xl shadow-md transition duration-150"
            >
              Tớ biết rồi nha
            </button>
          </div>
        </div>
      )}

      {/* POPUP 2 */}
      {showBusyPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-pink-100 text-center">
            <p className="text-gray-700 font-semibold mt-4 mb-6 text-lg">Cậu bận thật sao</p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setShowBusyPopup(false)}
                className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-xl shadow-md transition duration-150 min-w-[80px]"
              >
                Khum
              </button>
              <button
                type="button"
                onClick={handleConfirmBusy}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-semibold rounded-xl transition duration-150 min-w-[80px]"
              >
                Yep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}