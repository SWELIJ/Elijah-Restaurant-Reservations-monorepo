import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import ErrorAlert from "../layout/ErrorAlert";
import Reservations from "../reservations/Reservations";
import { readByPhone } from "../utils/api";

export default function Search() {
  const initialFormState = {
    mobile_number: "",
  };
  
  const [form, setForm] = useState({ ...initialFormState });
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState([]);

  const history = useHistory();

  const handleChange = ({ target }) => {
   
    setForm({
      ...form,
      [target.name]: target.value,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const abortController = new AbortController();
   
    async function findByPhone() {
      try {
        const response = await readByPhone(
          form.mobile_number,
          abortController.signal
        );
        if (response.length === 0) {
          setSearchResults(["No reservations found"]);
        } else {
          setSearchResults(response);
        }
      } catch (error) {
        setSearchError([...searchError, error.message]);
      }
    }
  
    if (searchError.length === 0) {
      findByPhone();
    }
  };

  return (
    <>
      <div className="headingBar d-md-flex my-3 p-2">
        <h1>Search by Phone Number</h1>
      </div>
      <ErrorAlert error={searchError} />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="mobile_number">Mobile Number</label>
          <input
            id="mobile_number"
            className="form-control"
            type="text"
            name="mobile_number"
            
            placeholder="Enter customer phone number"
            onChange={handleChange}
            required="required"
            value={form.mobile_number}
          />
        </div>
        <button className="btn btn-primary mb-3" type="submit">
          Find
        </button>
        <button
          className="btn btn-primary mx-3 mb-3"
          type="button"
          onClick={() => history.goBack()}
        >
          Cancel
        </button>
      </form>
      {searchResults[0] === "No reservations found" ? (
        <h4>{searchResults[0]}</h4>
      ) : (
        <Reservations reservations={searchResults} />
      )}
    </>
  );
}
