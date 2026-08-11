import React, { useContext, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { ShopContext } from "../context/ShopContext";

const Verify = () => {
  const { navigate, token, setCartItems, backendUrl } = useContext(ShopContext);

  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get("session_id");

  const verifyPayment = async () => {
    try {
      if (!token) {
        return;
      }

      if (!sessionId) {
        toast.error("Invalid payment session.");
        navigate("/cart");
        return;
      }

      const response = await axios.get(
        `${backendUrl}/api/order/stripe-session/${sessionId}`,
        {
          headers: {
            token,
          },
        },
      );

      if (response.data.success && response.data.paymentStatus === "paid") {
        setCartItems({});
        navigate("/orders");
      } else {
        toast.error("Payment is not completed yet.");
        navigate("/cart");
      }
    } catch (error) {
      console.error("VERIFY PAYMENT ERROR:", error);

      toast.error(error.response?.data?.message || "Unable to verify payment.");

      navigate("/cart");
    }
  };

  useEffect(() => {
    if (token) {
      verifyPayment();
    }
  }, [token, sessionId]);

  return null;
};

export default Verify;
