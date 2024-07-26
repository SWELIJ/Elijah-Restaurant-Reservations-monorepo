const router = require("express").Router();
const controller = require("./reservations.controller");
const methodNotAllowed = require("../errors/methodNotAllowed");


//test
router
    .route("/:reservationId")
    .get(controller.read)
    .put(controller.updateReservation)
    .all(methodNotAllowed);

router
    .route("/")
    .get(controller.list)
    .post(controller.create)
    .all(methodNotAllowed);
    
router
    .route("/:reservationId/status")
    .put(controller.updateStatus)
    .all(methodNotAllowed);
module.exports = router;