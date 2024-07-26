import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { postTable } from "../utils/api";
import ErrorAlert from "../layout/ErrorAlert";

export default function TableForm() {
  const initialFormState = {
    table_name: "",
    capacity: "",
  };

  const [form, setForm] = useState({ ...initialFormState });
  const [reservationsError, setReservationsError] = useState([]);

  const history = useHistory();
  const abortController = new AbortController();

  const handleChange = ({ target }) => {
    let name = target.name;
    let value = target.value;

    // check name length
    if (name === "table_name") {
      if (value.length < 2) {
        setReservationsError([
          "Table Name must be at least 2 characters.",
        ]);
      } else {
        setReservationsError([]);
      }
    }

    // check capacity
    if (name === "capacity") {
      if (isNaN(value)) {
        setReservationsError(["Capacity must be a number."]);
      } else if (value < 1) {
        setReservationsError(["Capacity must be at least 1."]);
      } else {
        setReservationsError([]);
      }
    }

    setForm({
      ...form,
      [target.name]: target.value,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // POST
    async function postData() {
      try {
        await postTable(form, abortController.signal);
        history.push(`/dashboard`);
      } catch (error) {
        setReservationsError([...reservationsError, error.message]);
      }
    }
    // check for errors
    if (reservationsError.length === 0) {
      postData();
    }
  };

  return (
    <>
      <ErrorAlert error={reservationsError} />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="table_name">Table Name</label>
          <input
            id="table_name"
            className="form-control"
            type="text"
            name="table_name"
            
            onChange={handleChange}
            required="required"
            value={form.table_name}
          />
        </div>
        <div className="form-group">
          <label htmlFor="capacity">Table Capacity</label>
          <input 
            id="capacity"
            className="form-control"
            type="number"
            name="capacity"
           
            onChange={handleChange}
            required="required"
            value={form.capacity}
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Submit
        </button>
        <button
          className="btn btn-danger mx-3"
          type="button"
          onClick={() => history.goBack()}
        >
          Cancel
        </button>
      </form>
    </>
  );
}
