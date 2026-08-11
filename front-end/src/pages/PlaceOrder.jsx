import React, { useContext, useState } from "react";
import Title from "../components/Title";
import CartTotal from "../components/CartTotal";
import { assets } from "../assets/assets";
import { ShopContext } from "../context/ShopContext";
import axios from "axios";
import { toast } from "react-toastify";

const PlaceOrder = () => {
  const [method, setMethod] = useState("cod");

  const { navigate, backendUrl, token, cartItems, setCartItems, products } =
    useContext(ShopContext);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "",
    phone: "",
  });

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const onChangeHandler = (event) => {
    const { name, value } = event.target;

    setFormData((data) => ({
      ...data,
      [name]: value,
    }));
  };

  // ==========================================
  // PLACE ORDER
  // ==========================================

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    try {
      if (!token) {
        toast.error("Please login before placing an order.");
        navigate("/login");
        return;
      }

      // ==========================================
      // BUILD ORDER ITEMS
      // IMPORTANT:
      // We only send productId, size and quantity.
      // PRICE IS NOT SENT TO BACKEND.
      // ==========================================

      const orderItems = [];

      for (const productId in cartItems) {
        for (const size in cartItems[productId]) {
          const quantity = cartItems[productId][size];

          if (quantity > 0) {
            // Make sure the product actually exists
            const product = products.find((item) => item._id === productId);

            if (!product) {
              toast.error(
                "One of the products in your cart is no longer available.",
              );
              return;
            }

            // Make sure the selected size exists
            if (!product.sizes.includes(size)) {
              toast.error(`Size ${size} is not available for ${product.name}.`);
              return;
            }

            orderItems.push({
              productId: product._id,
              size,
              quantity: Number(quantity),
            });
          }
        }
      }

      // ==========================================
      // EMPTY CART CHECK
      // ==========================================

      if (orderItems.length === 0) {
        toast.error("Your cart is empty.");
        return;
      }

      // ==========================================
      // ORDER DATA
      //
      // DO NOT SEND:
      // amount
      // price
      //
      // Backend calculates the real total.
      // ==========================================

      const orderData = {
        address: formData,
        items: orderItems,
      };

      // ==========================================
      // CASH ON DELIVERY
      // ==========================================

      if (method === "cod") {
        const response = await axios.post(
          `${backendUrl}/api/order/place`,
          orderData,
          {
            headers: {
              token,
            },
          },
        );

        if (response.data.success) {
          setCartItems({});
          toast.success("Order placed successfully!");
          navigate("/orders");
        } else {
          toast.error(response.data.message);
        }

        return;
      }

      // ==========================================
      // STRIPE
      // ==========================================

      if (method === "stripe") {
        const response = await axios.post(
          `${backendUrl}/api/order/stripe`,
          orderData,
          {
            headers: {
              token,
            },
          },
        );

        if (response.data.success) {
          const { session_url } = response.data;

          if (!session_url) {
            toast.error("Stripe checkout session was not created.");
            return;
          }

          // Redirect customer to Stripe Checkout
          window.location.replace(session_url);
        } else {
          toast.error(response.data.message);
        }

        return;
      }

      // ==========================================
      // RAZORPAY
      // ==========================================

      if (method === "razorpay") {
        toast.info("Razorpay payment is not implemented yet.");
        return;
      }
    } catch (error) {
      console.error("PLACE ORDER ERROR:", error);

      toast.error(
        error.response?.data?.message ||
          "Something went wrong while placing the order.",
      );
    }
  };

  return (
    <form
      onSubmit={onSubmitHandler}
      className="flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t"
    >
      {/* ==========================================
          LEFT SIDE
          ========================================== */}

      <div className="flex flex-col gap-4 w-full sm:max-w-[480px]">
        <div className="text-xl sm:text-2xl my-3">
          <Title text1="DELIVERY" text2="INFORMATION" />
        </div>

        {/* First + Last Name */}

        <div className="flex gap-3">
          <input
            required
            name="firstName"
            value={formData.firstName}
            onChange={onChangeHandler}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="First Name"
          />

          <input
            required
            name="lastName"
            value={formData.lastName}
            onChange={onChangeHandler}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Last Name"
          />
        </div>

        {/* Email */}

        <input
          required
          name="email"
          value={formData.email}
          onChange={onChangeHandler}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="email"
          placeholder="Email Address"
        />

        {/* Street */}

        <input
          required
          name="street"
          value={formData.street}
          onChange={onChangeHandler}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="text"
          placeholder="Street"
        />

        {/* City + State */}

        <div className="flex gap-3">
          <input
            required
            name="city"
            value={formData.city}
            onChange={onChangeHandler}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="City"
          />

          <input
            required
            name="state"
            value={formData.state}
            onChange={onChangeHandler}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="State"
          />
        </div>

        {/* Zipcode + Country */}

        <div className="flex gap-3">
          <input
            required
            name="zipcode"
            value={formData.zipcode}
            onChange={onChangeHandler}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Zipcode"
          />

          <input
            required
            name="country"
            value={formData.country}
            onChange={onChangeHandler}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Country"
          />
        </div>

        {/* Phone */}

        <input
          required
          name="phone"
          value={formData.phone}
          onChange={onChangeHandler}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="tel"
          placeholder="Phone"
        />
      </div>

      {/* ==========================================
          RIGHT SIDE
          ========================================== */}

      <div className="mt-8 w-full sm:max-w-[480px]">
        {/* Cart Total */}

        <div className="mt-8 min-w-80">
          <CartTotal />
        </div>

        {/* Payment Method */}

        <div className="mt-12">
          <Title text1="PAYMENT" text2="METHOD" />

          <div className="flex gap-3 flex-col lg:flex-row mt-4">
            {/* STRIPE */}

            <div
              onClick={() => setMethod("stripe")}
              className={`flex items-center gap-3 border p-2 px-3 cursor-pointer ${
                method === "stripe" ? "border-black" : "border-gray-300"
              }`}
            >
              <p
                className={`min-w-3.5 h-3.5 border rounded-full ${
                  method === "stripe" ? "bg-green-400" : ""
                }`}
              ></p>

              <img
                src={assets.stripe_logo}
                alt="Stripe"
                className="h-5 w-auto object-contain"
              />
            </div>

            {/* RAZORPAY */}

            <div
              onClick={() => setMethod("razorpay")}
              className={`flex items-center gap-3 border p-2 px-3 cursor-pointer ${
                method === "razorpay" ? "border-black" : "border-gray-300"
              }`}
            >
              <p
                className={`min-w-3.5 h-3.5 border rounded-full ${
                  method === "razorpay" ? "bg-green-400" : ""
                }`}
              ></p>

              <img
                src={assets.razorpay_logo}
                alt="Razorpay"
                className="h-5 w-auto object-contain"
              />
            </div>

            {/* COD */}

            <div
              onClick={() => setMethod("cod")}
              className={`flex items-center gap-3 border p-2 px-3 cursor-pointer ${
                method === "cod" ? "border-black" : "border-gray-300"
              }`}
            >
              <p
                className={`min-w-3.5 h-3.5 border rounded-full ${
                  method === "cod" ? "bg-green-400" : ""
                }`}
              ></p>

              <p className="text-gray-500 text-sm font-medium">
                CASH ON DELIVERY
              </p>
            </div>
          </div>

          {/* PLACE ORDER */}

          <div className="w-full text-end mt-8">
            <button
              type="submit"
              className="bg-black text-white px-16 py-3 text-sm cursor-pointer"
            >
              PLACE ORDER
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default PlaceOrder;
